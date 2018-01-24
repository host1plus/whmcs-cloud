/*
    Makes API call
    param: object - [string]api object
    param: method - [string]api method
    param: data - [json string]data to pass for api
    param: additionalGETparams - [json object]data to pass as get params
*/
function apiCall( object, method, data, additionalGETparams, callback_params, async ){
    var apiCalllURL = api_url + object;

    if( typeof additionalGETparams !== 'undefined' ){
        urlGetParams = Object.keys( additionalGETparams ).map(function(k) {
            return encodeURIComponent(k) + '=' + encodeURIComponent( additionalGETparams[k] )
        }).join('&');
    }

    apiCalllURL += typeof urlGetParams !== 'undefined' ? '?' + urlGetParams + '&' + Date.now() : '&' + Date.now();

    method = typeof method !== 'undefined' ? method : 'GET';
    data = typeof data !== 'undefined' ? data : ''
    async = typeof async !== 'undefined' ? async : true;

    var request = $.ajax({
        self_callback_params: callback_params,
        url: apiCalllURL,
        method: method,
        data: data,
        async: async,
        dataType: "json"
    });

    request.done(function( data ) {
        //global done
    });

    request.fail(function( error ) {
        //global fail
    });

    return request;
}


$(document).ready(function(){
    loadTasks();
});

function loadTasks(){

    var limit = $('[data-tasklog-limit]').val();
    var statusCode = $('[data-tasklog-state]').val();
    var action = $('[data-tasklog-action]').val();
    var sortDesc = $('[data-tasklog-sort]').val();
    var resultCode = $('[data-tasklog-resultcode]').val();
    var sortBy = $('[data-tasklog-sortby]').val();

    var requestParams = {
        pagesize:limit,
        statusCode:statusCode,
        action:action,
        sort:sortBy,
        sortDesc:sortDesc
    };
    
    if( resultCode.length > 0 ){
        requestParams.resultCode = resultCode;
    }

    $.when(
        apiCall( service_id + '/jobs', 'GET', '', requestParams )
    ).then(function(response){
        if( response.data.length > 0 ){
            $('[data-tasklog-list]').html('');
            for (const key in response.data) {
                if (response.data.hasOwnProperty(key)) {
                    const task = response.data[key];
                
                    var html = '';
        
                    html += '<tr>';
                    
                    html += '<td>'+task.id+'</td>';
                    html += '<td class="">'+task.status+'</td>';
                    html += '<td class="">'+task.resultCode+'</td>';
                    html += '<td>'+task.instance+'</td>';
                    html += '<td>'+task.action+'</td>';
                    html += '<td>'+JSON.stringify(task.metadata)+'</td>';
                    html += '<td>'+unixToDate( task.created )+'</td>';
        
                    html += '</tr>';
        
                    $('[data-tasklog-list]').append( html );
                }
            }
        }
        else{
            $('[data-tasklog-list]').html('<tr><td colspan=7>No data</td></tr>');
        }
    },
    function(response){
        $('[data-tasklog-list]').html('<tr><td colspan=7 style="color:red;">'+response.responseJSON.message+'</td></tr>');
    }
    );
}

function service_load_templates(){
    $('[data-reinstall-content]').hide();
    $('[data-reinstall-loader]').show();
    $.when(
        apiCall( service_id + '/templates', 'GET', '', {} )
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
            $('#reinstall_modal [data-error-alert] [data-error-messsage]').text( 'Message: ' + response.message );
            $('#reinstall_modal [data-error-alert]').show();
        }
    },
    function(response){
        $('#reinstall_modal [data-error-alert] [data-error-messsage]').text( 'Message: ' + response.message );
        $('#reinstall_modal [data-error-alert]').show();
    }
    );
}

function service_reinstall_template(){

    $('#reinstall_modal [data-error-alert]').hide();
    $('#reinstall_modal').find('[data-dismiss="modal"]').click();

    var template_id = $('[data-reinstall-template-select]').val();

    $.when(
        apiCall( service_id +'/reinstall', 'POST', JSON.stringify({templateId:template_id}), {} )
    ).then(function(response){
        if( response.status == 'success' ){
            $('[data-tasklog-open-btn]').click();
        }
        else{
            $('#reinstall_modal [data-error-alert] [data-error-messsage]').text( 'Message: ' + response.message );
            $('#reinstall_modal [data-error-alert]').show();
        }
    },
    function(response){
        $('#reinstall_modal [data-error-alert] [data-error-messsage]').text( 'Message: ' + response.message );
        $('#reinstall_modal [data-error-alert]').show();
    }
    );

}


function unixToDate( unix_timestamp ){
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