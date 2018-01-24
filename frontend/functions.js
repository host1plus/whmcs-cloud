function H1P_cloud() {}

H1P_cloud.show_error = function( response ){
    $('[data-error-alert] [data-error-messsage]').text( 'Message: ' + response.message );
    $('[data-error-alert]').show();
}

H1P_cloud.service_init = function(){
    $.when(
        H1PapiCall( service_id + '/jobs', 'GET', '', {page:1, pagesize:5, statusCode: '0,1', disabled: 0} )
    ).then(function(response){
        if( response.data.length > 0 ){
            H1P_cloud.service_check_job( response.data[0].id );
        }
    },
    function(response){
    }
    );

    H1P_cloud.load_product_options();
    H1P_cloud.getOsTypes();

    $('[data-schedule-timezone]').html('');
    for (var key in timezones) {
        if (timezones.hasOwnProperty(key)) {
            var tz = timezones[key];
            $('[data-schedule-timezone]').append('<option value="'+tz+'">'+tz+'</option>');
        }
    }
    $('[data-select-minutes]').html('');
    for(var i = 0; i < 60; i++) {
        $('[data-select-minutes]').append('<option value="'+(i>9?i:"0"+i)+'">'+(i>9?i:"0"+i)+'</option>');
    }
    $('[data-select-hours]').html('');
    for(var i = 0; i < 24; i++) {
        $('[data-select-hours]').append('<option value="'+(i>9?i:"0"+i)+'">'+(i>9?i:"0"+i)+'</option>');
    }
    $('[data-select-dayofmonth]').html('');
    for(var i = 1; i <= 28; i++) {
        $('[data-select-dayofmonth]').append('<option value="'+(i>9?i:"0"+i)+'">'+(i>9?i:"0"+i)+'</option>');
    }

}

H1P_cloud.service_load_info = function(){

    H1P_cloud.lock_service_front();

    $.when(
        H1PapiCall( service_id, 'GET', {}, {} )
    ).then(function(response){
        service_data = response.data;
        console.log( service_data );

        $.when(
            H1PapiCall( service_id + '/volumes', 'GET', {}, {} )
        ).then(function(response){

            H1P_cloud.service_init();

            volumes = response.data;
            H1P_cloud.show_service_info();
            H1P_cloud.service_load_backups();
            H1P_cloud.service_load_tasks();
            H1P_cloud.service_loadisos();
            // cloud_load_subnets();
            // cloud_get_notifications_api();
            
            H1P_cloud.loadStatistics();
        },
        function(response){
            H1P_cloud.show_error( response.responseJSON );
        }
        );
    },
    function(response){
        H1P_cloud.show_error( response.responseJSON );
    }
    );
}

H1P_cloud.show_service_info = function(){

    H1P_cloud.loadSchedules();

    $('[data-service-state]').text( H1P_cloud.capitalizeFirstLetter( service_data.state ) )
    $('[data-service-state]').removeClass('text-success').removeClass('text-warning')
    if( service_data.state.toLowerCase() == 'running' ) $('[data-service-state]').removeClass('text-danger').addClass('text-success');
    if( service_data.state.toLowerCase() == 'stopped' ) $('[data-service-state]').removeClass('text-success').addClass('text-danger');

    $('[data-service-cpu]').text( service_data.cpuNumber )
    $('[data-service-template]').text( service_data.templateDisplayText )

    $('[data-service-location]').text( '-' )
    $('[data-service-ram]').text( service_data.memory + ' MB' )
    $('[data-service-server]').html( service_data.nic[0].ipAddress + ' <br> root / <span data-service-password>*****</span> <small style="cursor:pointer;" data-show-pass>['+js_lang.show+']</small><small data-hide-pass style="cursor:pointer;display:none;">['+js_lang.hide+']</small>' )

    $('[data-hostname-input]').val( service_data.displayName );

    $('[data-mountediso-row]').hide();
    if( service_data.isoId != null ){
        $('[data-service-mountediso]').text( service_data.isoName );
        $('[data-mountediso-row]').show();
    }

    $('[data-storage-list]').html('');

    for (const key in volumes) {
        if (volumes.hasOwnProperty(key)) {
            const storage = volumes[key];
        
            var html = '';

            html += '<tr>';
            
            html += '<td>'+storage.name+'</td>';
            html += '<td>'+H1P_cloud.bytesToString( storage.size, 0 )+'</td>';
            html += '<td><button class="btn btn-default btn-sm" onclick="H1P_cloud.create_backup(\''+storage.id+'\')" data-btn-lockable>'+js_lang.backup+'</button> <button class="btn btn-default btn-sm" data-btn-lockable onclick="$(\'[data-schedule-disk-id]\').val(\''+ storage.id +'\')" data-toggle="modal" data-target="#backup_schedule_modal">'+js_lang.backup_schedule+'</button></td>';

            html += '</tr>';

            $('[data-storage-list]').append( html );

            $('[data-restore-backup-disk]').append('<option value="'+ storage.id +'">'+ storage.name +'</option>');
        }
    }

    H1P_cloud.unlock_service_front();

    $('[data-additionalIP-list]').html('');

    for (const key in service_data.nic[0].secondaryIp) {
        if (service_data.nic[0].secondaryIp.hasOwnProperty(key)) {
            const ip = service_data.nic[0].secondaryIp[key];
        
            var html = '';

            html += '<tr>';
            
            html += '<td>'+ip+'</td>';
            
            html += '</tr>';

            $('[data-additionalIP-list]').append( html );
        }
    }
}

H1P_cloud.create_backup = function( volume_id ){
    H1P_cloud.lock_service_front();
    $('[data-error-alert]').hide();

    var r = confirm( js_lang.are_you_sure );
    if (r == true) {
        $.when(
            H1PapiCall( service_id + '/volumes/' + volume_id + '/backup', 'POST', {}, {} )
        ).then(function(response){
            if( response.status == 'success' ){
                H1P_cloud.service_check_job( response.data.id );
            }
            else{
                H1P_cloud.show_error( response );
                H1P_cloud.unlock_service_front();
            }
        },
        function(response){
            H1P_cloud.show_error( response.responseJSON );
            H1P_cloud.unlock_service_front();
        }
        );
    } else {
        H1P_cloud.unlock_service_front();
    }
}

H1P_cloud.service_load_backups = function(){
    $.when(
        H1PapiCall( service_id + '/backups', 'GET', {}, {} )
    ).then(function(response){
        backups = response.data;
        H1P_cloud.service_list_backups();
    },
    function(response){
        H1P_cloud.show_error( response.responseJSON );
    }
    );
}

H1P_cloud.service_list_backups = function(){
    $('[data-backups-list]').html('');

    if( backups.length > 0 ){
        for (const key in backups) {
            if (backups.hasOwnProperty(key)) {
                const bck = backups[key];
            
                var date = new Date( bck.created );

                var html = '';

                html += '<tr>';
                
                html += '<td class="w200">'+bck.name+'</td>';
                html += '<td>'+H1P_cloud.bytesToString( bck.physicalSize, 0 )+'</td>';
                html += '<td>'+date.format1()+'</td>';
                html += '<td><button class="btn btn-default btn-sm" data-btn-lockable onclick="$(\'[data-restore-backup-id]\').val(\''+bck.id+'\')" data-toggle="modal" data-target="#restore_modal">'+js_lang.restore+'</button> <button class="btn btn-danger btn-sm" data-btn-lockable onclick="H1P_cloud.delete_backup(\''+bck.id+'\')">'+js_lang.delete+'</button></td>';

                html += '</tr>';

                $('[data-backups-list]').append( html );
            }
        }
    }
    else{
        $('[data-backups-list]').html('<tr><td colspan=4>'+js_lang.nodata+'</td></tr>');
    }
}


H1P_cloud.restore_backup = function(){
    H1P_cloud.lock_service_front();
    $('[data-error-alert]').hide();
    $('#restore_modal').find('[data-dismiss="modal"]').click();

    var disk_id = $('[data-restore-backup-disk]').val();
    var backup_id = $('[data-restore-backup-id]').val();

    $.when(
        H1PapiCall( service_id +'/restore', 'POST', JSON.stringify({backupId:backup_id, volumeId:disk_id}), {} )
    ).then(function(response){
        if( response.status == 'success' ){
            H1P_cloud.service_check_job( response.data.id );
        }
        else{
            H1P_cloud.show_error( response );
            H1P_cloud.unlock_service_front();
        }
    },
    function(response){
        H1P_cloud.show_error( response.responseJSON );
        H1P_cloud.unlock_service_front();
    }
    );
}

H1P_cloud.delete_backup = function( id ){
    H1P_cloud.lock_service_front();
    $('[data-error-alert]').hide();

    var r = confirm( js_lang.are_you_sure );
    if (r == true) {
        $.when(
            H1PapiCall( service_id +'/backups/' + id, 'DELETE', {}, {} )
        ).then(function(response){
            if( response.status == 'success' ){
                H1P_cloud.service_check_job( response.data.id );
            }
            else{
                H1P_cloud.show_error( response );
                H1P_cloud.unlock_service_front();
            }
        },
        function(response){
            H1P_cloud.show_error( response.responseJSON );
            H1P_cloud.unlock_service_front();
        }
        );
    } else {
        H1P_cloud.unlock_service_front();
    }
}

H1P_cloud.delete_schedule = function( id, disk_id ){
    H1P_cloud.lock_service_front();
    $('[data-error-alert]').hide();

    var r = confirm( js_lang.are_you_sure );
    if (r == true) {
        $.when(
            H1PapiCall( service_id +'/volumes/'+ disk_id +'/backupSchedules/' + id, 'DELETE', {}, {} )
        ).then(function(response){
            H1P_cloud.loadSchedules();
            H1P_cloud.unlock_service_front();
        },
        function(response){
            H1P_cloud.show_error( response.responseJSON );
            H1P_cloud.unlock_service_front();
        }
        );
    } else {
        H1P_cloud.unlock_service_front();
    }
}


H1P_cloud.service_restart = function(){
    H1P_cloud.lock_service_front();
    $('[data-error-alert]').hide();

    $.when(
        H1PapiCall( service_id +'/reboot', 'POST', {}, {} )
    ).then(function(response){
        if( response.status == 'success' ){
            H1P_cloud.service_check_job( response.data.id );
        }
        else{
            H1P_cloud.show_error( response );
            H1P_cloud.unlock_service_front();
        }
    },
    function(response){
        H1P_cloud.show_error( response.responseJSON );
        H1P_cloud.unlock_service_front();
    }
    );
}

H1P_cloud.service_stop = function(){
    H1P_cloud.lock_service_front();
    $('[data-error-alert]').hide();

    $.when(
        H1PapiCall( service_id +'/stop', 'POST', {}, {} )
    ).then(function(response){
        if( response.status == 'success' ){
            H1P_cloud.service_check_job( response.data.id );
        }
        else{
            H1P_cloud.show_error( response );
            H1P_cloud.unlock_service_front();
        }
    },
    function(response){
        H1P_cloud.show_error( response.responseJSON );
        H1P_cloud.unlock_service_front();
    }
    );
}

H1P_cloud.service_start = function(){
    H1P_cloud.lock_service_front();
    $('[data-error-alert]').hide();

    $.when(
        H1PapiCall( service_id +'/start', 'POST', {}, {} )
    ).then(function(response){
        if( response.status == 'success' ){
            H1P_cloud.service_check_job( response.data.id );
        }
        else{
            H1P_cloud.show_error( response );
            H1P_cloud.unlock_service_front();
        }
    },
    function(response){
        H1P_cloud.show_error( response.responseJSON );
        H1P_cloud.unlock_service_front();
    }
    );
}

H1P_cloud.service_load_tasks = function(){
    $.when(
        H1PapiCall( service_id + '/jobs', 'GET', '', {page:1, pagesize:20, sort:'id', sortDesc:1, disabled:0} )
    ).then(function(response){
        if( response.data.length > 0 ){
            $('[data-tasklog-list]').html('');
            for (const key in response.data) {
                if (response.data.hasOwnProperty(key)) {
                    const task = response.data[key];
                
                    var html = '';
        
                    html += '<tr>';
                    
                    html += '<td class="">'+task.status+'</td>';
                    html += '<td>'+task.instance+'</td>';
                    html += '<td>'+task.action+'</td>';
                    html += '<td>'+H1P_cloud.unixToDate( task.created )+'</td>';
        
                    html += '</tr>';
        
                    $('[data-tasklog-list]').append( html );
                }
            }
        }
        else{
            $('[data-tasklog-list]').html('<tr><td colspan=4>'+js_lang.nodata+'</td></tr>');
        }
    },
    function(response){
    }
    );
}


H1P_cloud.service_loadConsole = function(){

    $.when(
        H1PapiCall( service_id + '/vnc', 'POST', {}, {} )
    ).then(function(response){
        if( response.status == 'success' ){
            $('[data-vnc-link]').attr('href', response.data.url);
            $('[data-vnc-wrap]').html( '<iframe id="vm_console" src="' + response.data.url + '" style="width:100%;height:440px;border:none;"></iframe>' );
        }
        else{
            H1P_cloud.show_error( response );
        }
    },
    function(response){
        H1P_cloud.show_error( response.responseJSON );
    }
    );
}

H1P_cloud.create_backup_schedule = function(){

    var schedule_time = '';
    var intervaltype = $('[data-schedule-interval]').val();

    switch( intervaltype ) {
        case 'HOURLY':
            schedule_time = $('[data-schedule-time-HOURLY] [data-select-minutes]').val();
        break;
        case 'DAILY':
            schedule_time = $('[data-schedule-time-DAILY] [data-select-minutes]').val()+':'+$('[data-schedule-time-DAILY] [data-select-hours]').val();
        break;
        case 'WEEKLY':
            schedule_time = $('[data-schedule-time-WEEKLY] [data-select-minutes]').val()+':'+$('[data-schedule-time-WEEKLY] [data-select-hours]').val()+':'+$('[data-schedule-time-WEEKLY] [data-select-weekday]').val();
        break;
        case 'MONTHLY':
            schedule_time = $('[data-schedule-time-MONTHLY] [data-select-minutes]').val()+':'+$('[data-schedule-time-MONTHLY] [data-select-hours]').val()+':'+$('[data-schedule-time-MONTHLY] [data-select-dayofmonth]').val();
        break;

    }

    $('#backup_schedule_modal').find('[data-dismiss="modal"]').click();

    var send_data = {
        intervalType: intervaltype,
        schedule: schedule_time,
        timeZone: $('[data-schedule-timezone]').val()
    };

    var disk_id = $('[data-schedule-disk-id]').val();

    $.when(
        H1PapiCall( service_id + '/volumes/'+disk_id+'/backupSchedules', 'POST', JSON.stringify( send_data ), {} )
    ).then(function(response){
        if( response.status == 'success' ){
            H1P_cloud.loadSchedules();
        }
        else{
            H1P_cloud.show_error( response );
        }
    },
    function(response){
        H1P_cloud.show_error( response.responseJSON );
    }
    );
}

H1P_cloud.loadSchedules = function(){

    for(const key in volumes) {
        let disk_id = volumes[key].id;

        let disk_info = H1P_cloud.getDiskById( disk_id );

        $.when(
            H1PapiCall( service_id + '/volumes/'+ disk_id +'/backupSchedules', 'GET', {}, {} )
        ).then(function(response){

            $('[data-schedules-list]').find('[data-no-data]').remove();
            $('[data-schedules-list]').find('[data-schedule-loader]').remove();
            $('[data-schedules-list]').find('[data-disk-id="'+disk_id+'"]').remove();

            if( response.data.length > 0 ){
                
                for (const key in response.data) {
                    if (response.data.hasOwnProperty(key)) {
                        const schedule = response.data[key];
                    
                        var schedule_type = '';
                        var time = '';
                        var day_text = '';
                        var day_value_text = '';

                        switch(schedule.intervalType) {
                            case 0:
                                schedule_type = 'HOURLY';
                                time = schedule.schedule;
                            break;
                            case 1:
                                schedule_type = 'DAILY';
                                var temptime = schedule.schedule.split(":");;
                                time = temptime[1] + ':' + temptime[0];
                            break;
                            case 2:
                                schedule_type = 'WEEKLY';
                                day_text = js_lang.day_of_week;
                                var temptime = schedule.schedule.split(":");
                                time = temptime[1] + ':' + temptime[0];
                                switch(temptime[2]) {
                                    case '1':day_value_text = js_lang.sunday;break;
                                    case '2':day_value_text = js_lang.monday;break;
                                    case '3':day_value_text = js_lang.tuesday;break;
                                    case '4':day_value_text = js_lang.wednesday;break;
                                    case '5':day_value_text = js_lang.thursday;break;
                                    case '6':day_value_text = js_lang.friday;break;
                                    case '7':day_value_text = js_lang.saturday;break;
                                }
                            break;
                            case 3:
                                schedule_type = 'MONTHLY';
                                day_text = js_lang.day_of_month;
                                var temptime = schedule.schedule.split(":");;
                                time = temptime[1] + ':' + temptime[0];
                                day_value_text = temptime[2];
                            break;
            
                        }

                        var html = '';
            
                        html += '<tr data-disk-id="'+disk_id+'">';
                        
                        html += '<td>'+disk_info.name+'</td>';
                        html += '<td class="">'+schedule_type+'</td>';
                        html += '<td>'+time+ ' ' + day_value_text +'</td>';
                        html += '<td><button class="btn btn-danger btn-sm" data-btn-lockable onclick="H1P_cloud.delete_schedule(\''+schedule.id+'\', \''+disk_info.id+'\')">'+js_lang.delete+'</button></td>';
            
                        html += '</tr>';
            
                        $('[data-schedules-list]').append( html );
                    }
                }
            }
            else{
                if( $('[data-schedules-list]').children().length < 1 ){
                    $('[data-schedules-list]').html('<tr data-no-data><td colspan=4>'+js_lang.nodata+'</td></tr>');
                }
            }
        },
        function(response){
        }
        );
    }
}

H1P_cloud.getDiskById = function( id ){
    
    if( volumes.length > 0 ){
        for (const key in volumes) {
            if (volumes.hasOwnProperty(key)) {
                if( volumes[key].id == id ){
                    return volumes[key];
                }
            }
        }
    }
    
    return {};
}

H1P_cloud.service_check_job = function( id ){
    if( typeof id != 'undefined' ){
        last_job_id = id;
    }
    H1P_cloud.lock_service_front();
    $.when(
        H1PapiCall( service_id + '/jobs/'+last_job_id, 'GET', '', {} )
    ).then(function(response){
        if( response.data.statusCode == 2 ){// statusCode = 2 , means completed
            last_job_id = null;
            frontend_state = 'active';
            H1P_cloud.service_load_info();
            // if( isos.length > 0 ){
            //     for (var key in isos) {
            //         if (isos.hasOwnProperty(key)) {
            //         if( vm_data.isoId == isos[key].id ){ //iso is mounted
            //             if( isos[key].bootable ){ //iso is bootable
            //             $('[data-serverlogin-overview-row]').hide();

            //             $( '[data-tab-id][data-tab-id="security"]' ).addClass( 'disabled' );
            //             $( '[data-tab-id][data-tab-id="security"]' ).css( 'pointer-events', 'none' );
            //             }
            //         }
            //         }
            //     }
            // }
        }
        else if( response.data.statusCode == 3 ){// statusCode = 3 , means failed
            last_job_id = null;
            H1P_cloud.service_load_info();
        }
        else{
            var start_time = response.data.created;
            var curent_time =  Math.floor(Date.now() / 1000);
            var seconds_passed = (curent_time - start_time);
            var timeout = 300000;
            if( seconds_passed < 60 ){
                timeout = 5000;
            }
            else if( seconds_passed >= 60 && seconds_passed < 120 ){
                timeout = 10000;
            }
            else if( seconds_passed >= 120 && seconds_passed < 300 ){ //5 mins passed
                timeout = 20000;
            }
            else if( seconds_passed >= 300 && seconds_passed < 600 ){ //10 mins passed
                timeout = 60000;
            }
            else if( seconds_passed >= 600 && seconds_passed < 1800 ){ //30 mins passed
                timeout = 300000;
            }
            //console.log( timeout );
            setTimeout(H1P_cloud.service_check_job, timeout);
        }
    },
    function(response){
        setTimeout(H1P_cloud.service_check_job, 30000);
    }
    );
}

H1P_cloud.service_reset_pw = function(){
    H1P_cloud.lock_service_front();
    $('[data-error-alert]').hide();

    var r = confirm( js_lang.are_you_sure );
    if (r == true) {
        $.when(
            H1PapiCall( service_id + '/resetRootPass', 'POST', '', {} )
        ).then(function(response){
            if( response.status == 'success' ){
                H1P_cloud.service_check_job( response.data.id );
            }
            else{
                H1P_cloud.show_error( response );
            }
        },
        function(response){
            H1P_cloud.show_error( response.responseJSON );
        }
        );
    }
    else{
        H1P_cloud.unlock_service_front();
    }
}

H1P_cloud.service_load_templates = function(){
    $('[data-reinstall-content]').hide();
    $('[data-reinstall-loader]').show();
    $.when(
        H1PapiCall( service_id + '/templates', 'GET', '', {} )
    ).then(function(response){
        if( response.status == 'success' ){

            $('[data-reinstall-template-select]').html('');
            
            if( response.data.length > 0 ){
                for (const key in response.data) {
                    if (response.data.hasOwnProperty(key)) {
                        const template = response.data[key];

                        $('[data-reinstall-template-select]').append('<option value="'+template.id+'">'+template.name+'</option>');
                    }
                }
            }

            $('[data-reinstall-loader]').hide();
            $('[data-reinstall-content]').show();
        }
        else{
            H1P_cloud.show_error( response );
        }
    },
    function(response){
        H1P_cloud.show_error( response.responseJSON );
    }
    );
}

H1P_cloud.service_reinstall_template = function(){

    H1P_cloud.lock_service_front();
    $('[data-error-alert]').hide();
    $('#reinstall_modal').find('[data-dismiss="modal"]').click();

    var template_id = $('[data-reinstall-template-select]').val();

    $.when(
        H1PapiCall( service_id +'/reinstall', 'POST', JSON.stringify({templateId:template_id}), {} )
    ).then(function(response){
        if( response.status == 'success' ){
            H1P_cloud.service_check_job( response.data.id );
        }
        else{
            H1P_cloud.show_error( response );
        }
    },
    function(response){
        H1P_cloud.show_error( response.responseJSON );
    }
    );

}

H1P_cloud.service_change_hostname = function(){
    $('[data-error-alert]').hide();
    $('#changehostname_modal').find('[data-dismiss="modal"]').click();

    var new_label = $('input[data-hostname-input]').val();

    var patch_data = { "displayName": new_label };

    //if( $('[data-cloud-name-new-updatehostname]').is(':checked') ){
        patch_data.name = new_label;
    //}

    $.when(
        H1PapiCall( service_id+'/names', 'PATCH', JSON.stringify( patch_data ), {} )
    ).then(function(response){
        if( response.status == 'success' ){
            $('[data-hostname-input]').text( new_label );
        }
        else{
            H1P_cloud.show_error( response );
        }
    },
    function(response){
        H1P_cloud.show_error( response.responseJSON );
    }
    );
}

H1P_cloud.lock_service_front = function(){
    $('[data-btn-lockable]').addClass('disabled').prop('disabled', true).css('pointer-events', 'none');
    $('[data-loader]').show();
}
H1P_cloud.unlock_service_front = function(){
    $('[data-btn-lockable]').removeClass('disabled').prop('disabled', false).css('pointer-events', 'auto');
    $('[data-loader]').hide();
}

H1P_cloud.capitalizeFirstLetter = function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

H1P_cloud.bytesToString = function(bytes, decimals) {
   if(bytes == 0) return '0 B';
   var k = 1024;
   var dm = decimals + 1 || 3;
   var sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
   var i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

H1P_cloud.unixToDate = function( unix_timestamp ){
    var date = new Date(unix_timestamp*1000);

    var months = ['01','02','03','04','05','06','07','08','09','10','11','12'];

    var year = date.getFullYear();
    var month = months[date.getMonth()];
    var day = date.getDate();

    var hours = date.getHours();
    var minutes = "0" + date.getMinutes();
    var seconds = "0" + date.getSeconds();
    
    // Will display time in 10:30:23 format
    return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
}


//events
$(document).on('click', '[data-show-pass]', function(){
    $(this).hide()
    $('[data-hide-pass]').show()
    $('[data-service-password]').text( service_data.password )
});
$(document).on('click', '[data-hide-pass]', function(){
    $(this).hide()
    $('[data-show-pass]').show()
    $('[data-service-password]').text('***')
});
$(document).on('click', '[data-schedule-interval]', function(){
    $('[data-schedule-time]').hide()
    $('[data-schedule-time-'+$(this).val()+']').show()
});

H1P_cloud.offsetDate = function( offset ){
    var date = new Date();
    date.setDate(date.getDate() + offset);
    return date;
}

H1P_cloud.stat_limit_change = function(){
    var limit = $('[data-stats-limit]').val();

    $('[data-plot]').hide();
    $('[data-plot$="'+limit+'"]').show();

}

H1P_cloud.plotYformatterBytes = function(value) {
    var storageQuantities = ["KBps", "MBps", "GBps", "TBps", "PBps"],
        val = value;

    for (var i=0; i < storageQuantities.length; i++){
        if (val <= 1024) {
            if (val % 1 === 0) {
                return val.toFixed() + storageQuantities[i] ;
            }
            return val.toFixed(2) + storageQuantities[i];
        }
        val = val / 1024;
    }

    return val.toFixed() + 'PB';
}

H1P_cloud.drawPlot = function( id, labels, datasets, max, yformatter ){
    var ctx = document.getElementById(id).getContext('2d');
    var chart = new Chart(ctx, {
        type: 'line',
        data:{
        labels: labels,
            datasets: datasets
    },
        options: {
            scales: {
                yAxes: [{
                    ticks: {                
                        min: 0,
                        max: max,
                        callback: yformatter
                    }
                }],
                xAxes: [{
                    ticks: {
                        callback: function(value) {                            
                            var date = new Date(value);

                            var months = ['01','02','03','04','05','06','07','08','09','10','11','12'];

                            //var year = date.getFullYear();
                            //var month = months[date.getMonth()];
                            var day = date.getDate();

                            var hours = date.getHours();
                            var minutes = "0" + date.getMinutes();
                            // var seconds = "0" + date.getSeconds();
                            
                            // Will display time in 10:30:23 format
                            return day + 'd ' + hours + ':' + minutes.substr(-2);
                        },
                    },
                }],
            }
        }
    });
}

H1P_cloud.loadStatistics = function(){

    $('[data-stats-refresh]').prop('disabled', 1);
    $('[data-stats-refresh]').children('.fa').addClass('fa-spin');

    var from = new Date();
    from.setDate(from.getDate() - 30);

   var from_timestamp = from.getTime()/1000;

    $.when(
        H1PapiCall( service_id + '/statistics', 'GET', '', { from: from_timestamp } )
    ).then(function(response){
        if( response.status == 'success' ){
            H1P_cloud.printCPUstats( response.data.cpu.avg.cpu.slice(-60), 'h' );
            H1P_cloud.printNetworkStats( response.data.network.avg.network.slice(-60), 'h' );
            H1P_cloud.printStorageStats( response.data.disk.avg.disk.slice(-60), 'h' );
            H1P_cloud.printStorageIOStats( response.data.disk.avg.disk.slice(-60), 'h' );

            if( typeof response.data.cpu.avg.cpu_avg_2d != 'undefined' ){
                if( response.data.cpu.avg.cpu_avg_2d.length > 1 ){
                    H1P_cloud.printCPUstats( response.data.cpu.avg.cpu_avg_2d.slice(-30), '2d' );
                    H1P_cloud.printNetworkStats( response.data.network.avg.network_avg_2d.slice(-30), '2d' );
                    H1P_cloud.printStorageStats( response.data.disk.avg.disk_avg_2d.slice(-30), '2d' );
                    H1P_cloud.printStorageIOStats( response.data.disk.avg.disk_avg_2d.slice(-30), '2d' );
                }
                else{
                    $('[data-stats-limit]').find('option[value="2d"]').prop('disabled', 1);
                }
            }
            else{
                $('[data-stats-limit]').find('option[value="2d"]').prop('disabled', 1);
            }
            if( typeof response.data.cpu.avg.cpu_avg_30d != 'undefined' ){
                if( response.data.cpu.avg.cpu_avg_30d.length > 1 ){
                    H1P_cloud.printCPUstats( response.data.cpu.avg.cpu_avg_30d.slice(-30), '30d' );
                    H1P_cloud.printNetworkStats( response.data.network.avg.network_avg_30d.slice(-30), '30d' );
                    H1P_cloud.printStorageStats( response.data.disk.avg.disk_avg_30d.slice(-30), '30d' );
                    H1P_cloud.printStorageIOStats( response.data.disk.avg.disk_avg_30d.slice(-30), '30d' );
                }
                else{
                    $('[data-stats-limit]').find('option[value="30d"]').prop('disabled', 1);
                }
            }
            else{
                $('[data-stats-limit]').find('option[value="30d"]').prop('disabled', 1);
            }
        }
        else{
            H1P_cloud.show_error( response );
        }
        
        $('[data-stats-refresh]').prop('disabled', 0);
        $('[data-stats-refresh]').children('.fa').removeClass('fa-spin');
    },
    function(response){
        H1P_cloud.show_error( response.responseJSON );
    }
    );
}

H1P_cloud.printCPUstats = function(data, plot){

    // draw cpu usage chart
    var cpuData = data;
    var cpu_labels = [];
    var cpu_values = [];
    var max_value = 0;

    for (const key in cpuData) {
        if (cpuData.hasOwnProperty(key)) {
            const element = cpuData[key];
            
            cpu_labels.push(new Date(element.time * 1000));

            var value = Math.round(element.utilization);

            cpu_values.push( value );

            if( value > max_value ){
                max_value = value;
            }

        }
    }

    if( max_value < 10 ){
        max_value += 1;
    }
    else if( max_value > 10 && max_value < 50 ){
        max_value += 10;
    }
    else if( max_value < 100 ){
        max_value = 100;
    }

    H1P_cloud.drawPlot(
        'cpuChart_' + plot,
        cpu_labels,
        [{
            label: js_lang.cpu_usage,
            data: cpu_values,
            backgroundColor: 'transparent',
            borderColor: 'rgb(0, 0, 0)',
            borderWidth: 1
        }],
        max_value,
        function(value){
            return value + '%'
        }
    );
}

H1P_cloud.printNetworkStats = function(data, plot){

    // draw network usage chart
    var labels = [];
    var values_read = [];
    var values_write = [];
    var max_value = 0;

    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            const element = data[key];
            
            labels.push(new Date(element.time * 1000));

            var value = Math.round(element.readKbs);
            var value_write = Math.round(element.writeKbs);

            values_read.push( value );
            values_write.push( value_write );

            if( value > max_value ){
                max_value = value;
            }

            if( value_write > max_value ){
                max_value = value_write;
            }

        }
    }

    if( max_value < 50 ){
        max_value += 10;
    }
    else{
        max_value += 100;
    }

    H1P_cloud.drawPlot(
        'networkChart_' + plot,
        labels,
        [{
            label: js_lang.network + '(' + js_lang.read + ')',
            data: values_read,
            backgroundColor: 'transparent',
            borderColor: 'blue',
            borderWidth: 1
        },
        {
            label: js_lang.network + '(' + js_lang.write + ')',
            data: values_write,
            backgroundColor: 'transparent',
            borderColor: 'green',
            borderWidth: 1  
        }
        ],
        max_value,
        H1P_cloud.plotYformatterBytes
    );
}

H1P_cloud.printStorageStats = function(data, plot){

    // draw network usage chart
    var labels = [];
    var values_read = [];
    var values_write = [];
    var max_value = 0;

    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            const element = data[key];
            
            labels.push(new Date(element.time * 1000));

            var value = Math.round(element.readKbs);
            var value_write = Math.round(element.writeKbs);

            values_read.push( value );
            values_write.push( value_write );

            if( value > max_value ){
                max_value = value;
            }

            if( value_write > max_value ){
                max_value = value_write;
            }

        }
    }

    H1P_cloud.drawPlot(
        'storageChart_' + plot,
        labels,
        [{
            label: js_lang.storage + '(' + js_lang.read + ')',
            data: values_read,
            backgroundColor: 'transparent',
            borderColor: 'blue',
            borderWidth: 1
        },
        {
            label: js_lang.storage + '(' + js_lang.write + ')',
            data: values_write,
            backgroundColor: 'transparent',
            borderColor: 'green',
            borderWidth: 1  
        }
        ],
        max_value,
        H1P_cloud.plotYformatterBytes
    );
}

H1P_cloud.printStorageIOStats = function(data, plot){

    // draw network usage chart
    var labels = [];
    var values_read = [];
    var values_write = [];
    var max_value = 0;

    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            const element = data[key];
            
            labels.push(new Date(element.time * 1000));

            var value = Math.round(element.readIops);
            var value_write = Math.round(element.writeIops);

            values_read.push( value );
            values_write.push( value_write );

            if( value > max_value ){
                max_value = value;
            }

            if( value_write > max_value ){
                max_value = value_write;
            }

        }
    }

    H1P_cloud.drawPlot(
        'storageIOChart_' + plot,
        labels,
        [{
            label: js_lang.storage_iops + '(' + js_lang.read + ')',
            data: values_read,
            backgroundColor: 'transparent',
            borderColor: 'blue',
            borderWidth: 1
        },
        {
            label: js_lang.storage_iops + '(' + js_lang.write + ')',
            data: values_write,
            backgroundColor: 'transparent',
            borderColor: 'green',
            borderWidth: 1  
        }
        ],
        max_value,
        function(value){
            return value + ''
        }
    );
}

//upgrade

H1P_cloud.load_product_options = function(){
    $.when(
        H1PapiCall( 'options', 'GET', { productId: package_id }, {} )
    ).then(function(response){
        var $options_wrap = $('#upgrade_modal options');
        var $ahdd_wrap = $('#upgrade_modal additional-discs');

        $('[options-loader]').hide();

        $options_wrap.html('');
        $ahdd_wrap.html('');

        for (const key in response.data) {
            if( key == 'additionalDisks' ) continue;
            if (response.data.hasOwnProperty(key)) {
                
                const element = response.data[key];
                
                if( element.max <= 0 ) continue;
                if( element.min == element.max ) continue;

                var slider_val = selected_configs[element.name];

                var html = '';
                html += '<div class="" data-slider-wrap="'+ key +'" style="padding-bottom:20px;">';
                html += '<div>' + element.name + '</div>';
                html += '<div class="">';
                html += '<input data-slider-id="'+ key +'" type="text" data-slider-min="'+ element.min / element.step +'" data-slider-max="'+ element.max / element.step +'" data-slider-step="1" data-slider-value="'+ slider_val +'"/>';
                html += '</div>';
                html += '</div>';

                $options_wrap.append( html );

                config_multiplier[key] = element.step;
                upgrade_sliders[key] = $('[data-slider-id="'+ key +'"]').slider({
                    formatter: function(value) {
                        return value + ' x ' + ' ' + element.step + ' ' + element.unit;
                    }
                });
                
            }
        }

        for (const key in response.data.additionalDisks) {
            if (response.data.additionalDisks.hasOwnProperty(key)) {
                
                const element = response.data.additionalDisks[key];

                var slider_val = selected_configs[element.name];

                var html = '';
                html += '<div class="" data-slider-wrap="ahdd_'+ key +'" style="padding-bottom:20px;">';
                html += '<div>' + element.name + '</div>';
                html += '<div class="">';
                html += '<input data-slider-id="ahdd_'+ key +'" type="text" data-slider-min="'+ element.min / element.step +'" data-slider-max="'+ element.max / element.step +'" data-slider-step="1" data-slider-value="'+ slider_val +'"/>';
                html += '</div>';
                html += '</div>';

                $ahdd_wrap.append( html );

                config_multiplier['ahdd_'+key] = element.step;
                upgrade_sliders['ahdd_'+key] = $('[data-slider-id="ahdd_'+ key +'"]').slider({
                    formatter: function(value) {
                        return value + ' x ' + ' ' + element.step + element.unit;
                    }
                });
                
            }
        }
        
        $('[data-slider-id]').change(function(){
            H1P_cloud.calc_upgrade_price();
        });
    },
    function(response){
        H1P_cloud.show_error( response.responseJSON );
    }
    );
}

H1P_cloud.calc_upgrade_price = function(){

    var send_data = H1P_cloud.getUpgradeParams();

    $.when(
        H1PapiCall( service_id + '/calcUpdatePricing', 'POST', JSON.stringify(send_data), {} )
    ).then(function(response){
        $('[data-upgrade-error-alert]').hide();
        $('[data-upgrade-btn]').prop('disabled', 0);
        var $upgrade_wrap = $('#upgrade_modal');

        if( response.status == 'success' ){
            $upgrade_wrap.find('[data-upgrade-total]').html(response.data.total);
        }
        $('[data-upgrade-summary]').show();
    },
    function(response){
        $('[data-upgrade-btn]').prop('disabled', 1);
        $('[data-upgrade-error-alert] [data-error-messsage]').text( 'Message: ' + response.responseJSON.message );
        $('[data-upgrade-error-alert]').show();
        $('[data-upgrade-summary]').hide();
    }
    );
}

H1P_cloud.service_upgrade = function(){

    var send_data = H1P_cloud.getUpgradeParams();

    $.when(
        H1PapiCall( service_id + '', 'PATCH', JSON.stringify(send_data), {} )
    ).then(function(response){
        $('#upgrade_modal').find('[data-dismiss="modal"]').click();
        if( response.data.invoiceId > 0 ){
            location.href = system_url + '/viewinvoice.php?id=' + response.data.invoiceId;
        }
        else location.reload();
    },
    function(response){
        $('[data-upgrade-btn]').prop('disabled', 1);
        $('[data-upgrade-error-alert] [data-error-messsage]').text( 'Message: ' + response.responseJSON.message );
        $('[data-upgrade-error-alert]').show();
        $('[data-upgrade-summary]').hide();
    }
    );
}

H1P_cloud.getUpgradeParams = function(){
    var send_data = {};
    send_data.additionalDisks = [];
    var ahdd_count = 1;

    for (const key in upgrade_sliders) {
        if (upgrade_sliders.hasOwnProperty(key)) {
            const element = upgrade_sliders[key];
            if( key.indexOf( 'ahdd' ) === 0 ){
                send_data.additionalDisks.push({key:ahdd_count++, value: upgrade_sliders[key].slider('getValue') * config_multiplier[key]});
            }
            else{
                send_data[key] = upgrade_sliders[key].slider('getValue') * config_multiplier[key];
            }
        }
    }

    return send_data;
}

H1P_cloud.getOsTypes = function(){
    $.when(
        H1PapiCall( service_id + '/osTypes', 'GET', {}, {} )
    ).then(function(response){
        for (const key in response.data) {
            if (response.data.hasOwnProperty(key)) {
                const os = response.data[key];

                $('[data-iso-os-type-select]').append('<option value="'+ os.id +'">'+ os.description +'</option>');
            }
        }
    }
    );
}

H1P_cloud.service_loadisos = function(){

    $.when(
        H1PapiCall( service_id + '/isos', 'GET', {}, {} )
    ).then(function(response){

        $('[data-isos-list]').html('');

        if( response.data.length > 0 ){
            for (const key in response.data) {
                if (response.data.hasOwnProperty(key)) {
                    const iso = response.data[key];

                    var html = '';

                    var sizeStr = '';
                    if( iso.size != null ){
                        sizeStr = ' ('+H1P_cloud.bytesToString( iso.size, 0 )+')';
                    }

                    var date = new Date( iso.created );

                    var str_if_disabled = '';
                    if( iso.status.toLowerCase() != 'ready' || service_data.isoId == iso.id ){
                        str_if_disabled = ' disabled';
                    }

                    html += '<tr>';
                    
                    html += '<td class="w200">'+iso.name+sizeStr+'</td>';
                    html += '<td>'+iso.status+'</td>';
                    html += '<td>'+date.format1()+'</td>';
                    html += '<td>';
                    if( service_data.isoId != iso.id ){
                        if( iso.bootable ){
                            html += '<button class="btn btn-primary btn-sm" data-btn-lockable onclick="H1P_cloud.install_iso(\''+iso.id+'\')"'+str_if_disabled+'>'+js_lang.install+'</button> ';
                        }
                        else{
                            html += '<button class="btn btn-primary btn-sm" data-btn-lockable onclick="H1P_cloud.mount_iso(\''+iso.id+'\')"'+str_if_disabled+'>'+js_lang.mount+'</button> ';
                        }
                        html += '<button class="btn btn-danger btn-sm" data-btn-lockable onclick="H1P_cloud.delete_iso(\''+iso.id+'\')">'+js_lang.delete+'</button> ';
                    }
                    else{
                        html += '<button class="btn btn-danger btn-sm" data-btn-lockable onclick="H1P_cloud.unmount_iso(\''+iso.id+'\')">'+js_lang.unmount+'</button> ';
                    }
                    html += '</td>';

                    html += '</tr>';

                    $('[data-isos-list]').append( html );
                }
            }
        }
        else{
            $('[data-isos-list]').html('<tr><td colspan=4>'+js_lang.nodata+'</td></tr>');
        }

    }
    );
}

H1P_cloud.service_uploadiso = function(){

    var send_data = {};
    send_data.name = $('[data-isoname-input]').val()
    send_data.url = $('[data-isourl-input]').val()
    if( $('[data-bootable-input]').is(':checked') ){
        send_data.bootable = true;
        send_data.osTypeId = $('[data-iso-os-type-select]').val();
    }

    $.when(
        H1PapiCall( service_id + '/isos', 'POST', JSON.stringify(send_data), {} )
    ).then(function(response){

    }
    );
}

H1P_cloud.delete_iso = function( id ){
    H1P_cloud.lock_service_front();
    $('[data-error-alert]').hide();

    var r = confirm( js_lang.are_you_sure );
    if (r == true) {
        $.when(
            H1PapiCall( service_id +'/isos/' + id, 'DELETE', {}, {} )
        ).then(function(response){
            if( response.status == 'success' ){
                H1P_cloud.service_check_job( response.data.id );
            }
            else{
                H1P_cloud.show_error( response );
                H1P_cloud.unlock_service_front();
            }
        },
        function(response){
            H1P_cloud.show_error( response.responseJSON );
            H1P_cloud.unlock_service_front();
        }
        );
    } else {
        H1P_cloud.unlock_service_front();
    }
}

H1P_cloud.toggleOsType = function(){
    if( $('[data-bootable-input]').is(':checked') ){
        $('[data-iso-os-type]').show();
    }
    else{
        $('[data-iso-os-type]').hide();
    }
}

H1P_cloud.iso_url_pasted = function(){
    setTimeout(function(){
        var split_link = $('[data-isourl-input]').val().split('/');
        $('[data-isoname-input]').val( $.trim( split_link[ split_link.length - 1 ] ) );
    });
}

Date.prototype.format1 = function() {
    var yyyy = this.getFullYear().toString();
    var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based
    var dd  = this.getDate().toString();
    var hh  = this.getHours().toString();
    var min  = this.getMinutes().toString();
    return yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0]) + ' ' + (hh[1]?hh:"0"+hh[0]) + ':' + (min[1]?min:"0"+min[0]); // padding
};


H1P_cloud.mount_iso = function( id ){
    H1P_cloud.lock_service_front();
    $('[data-error-alert]').hide();

    var r = confirm( js_lang.are_you_sure );
    if (r == true) {
        var send_data = {};
        send_data.isoId = id;

        $.when(
            H1PapiCall( service_id +'/attachIso', 'POST', JSON.stringify(send_data), {} )
        ).then(function(response){
            if( response.status == 'success' ){
                H1P_cloud.service_check_job( response.data.id );
            }
            else{
                H1P_cloud.show_error( response );
                H1P_cloud.unlock_service_front();
            }
        },
        function(response){
            H1P_cloud.show_error( response.responseJSON );
            H1P_cloud.unlock_service_front();
        }
        );
    } else {
        H1P_cloud.unlock_service_front();
    }
}
H1P_cloud.install_iso = function( id ){
    H1P_cloud.lock_service_front();
    $('[data-error-alert]').hide();

    var r = confirm( js_lang.are_you_sure );
    if (r == true) {
        var send_data = {};
        send_data.isoId = id;

        $.when(
            H1PapiCall( service_id +'/installIso', 'POST', JSON.stringify(send_data), {} )
        ).then(function(response){
            if( response.status == 'success' ){
                H1P_cloud.service_check_job( response.data.id );
            }
            else{
                H1P_cloud.show_error( response );
                H1P_cloud.unlock_service_front();
            }
        },
        function(response){
            H1P_cloud.show_error( response.responseJSON );
            H1P_cloud.unlock_service_front();
        }
        );
    } else {
        H1P_cloud.unlock_service_front();
    }
}

H1P_cloud.unmount_iso = function( id ){
    H1P_cloud.lock_service_front();
    $('[data-error-alert]').hide();

    var r = confirm( js_lang.are_you_sure );
    if (r == true) {

        $.when(
            H1PapiCall( service_id +'/detachIso', 'POST', {}, {} )
        ).then(function(response){
            if( response.status == 'success' ){
                H1P_cloud.service_check_job( response.data.id );
            }
            else{
                H1P_cloud.show_error( response );
                H1P_cloud.unlock_service_front();
            }
        },
        function(response){
            H1P_cloud.show_error( response.responseJSON );
            H1P_cloud.unlock_service_front();
        }
        );
    } else {
        H1P_cloud.unlock_service_front();
    }
}