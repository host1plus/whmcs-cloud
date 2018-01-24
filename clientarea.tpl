<script src="modules/servers/h1pcloud/frontend/api.js"></script>
<script src="modules/servers/h1pcloud/frontend/functions.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.20.1/moment.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.4.0/Chart.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-slider/10.0.0/bootstrap-slider.min.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-slider/10.0.0/css/bootstrap-slider.min.css" />


<script>
var system_url = '{$systemurl}';
var api_url = '{$systemurl}modules/addons/h1papi/cloudservers/';
var service_id = '{$id}';
var package_id = '{$packageid}';

var last_job_id = 'undefined';

var service_data = {};
var volumes = [];
var backups = [];
var timezones = {$tzlist|@json_encode};
var upgrade_sliders = {};
{literal}
var js_lang = {
        "show": "{/literal}{$addonLang.show}{literal}",
        "hide": "{/literal}{$addonLang.hide}{literal}",
        "backup": "{/literal}{$addonLang.backup}{literal}",
        "restore": "{/literal}{$addonLang.restore}{literal}",
        "delete": "{/literal}{$addonLang.delete}{literal}",
        "scope": "{/literal}{$addonLang.scope}{literal}",
        "action": "{/literal}{$addonLang.action}{literal}",
        "are_you_sure": "{/literal}{$addonLang.are_you_sure}{literal}",
        "nodata": "{/literal}{$addonLang.nodata}{literal}",

        "sunday": "{/literal}{$addonLang.sunday}{literal}",
        "monday": "{/literal}{$addonLang.monday}{literal}",
        "tuesday": "{/literal}{$addonLang.tuesday}{literal}",
        "wednesday": "{/literal}{$addonLang.wednesday}{literal}",
        "thursday": "{/literal}{$addonLang.thursday}{literal}",
        "friday": "{/literal}{$addonLang.friday}{literal}",
        "saturday": "{/literal}{$addonLang.saturday}{literal}",

        "backup_schedule": "{/literal}{$addonLang.backup_schedule}{literal}",
        
        "percentage": "{/literal}{$addonLang.percentage}{literal}",
        "cpu_usage": "{/literal}{$addonLang.cpu_usage}{literal}",
        "network": "{/literal}{$addonLang.network}{literal}",
        "storage": "{/literal}{$addonLang.storage}{literal}",
        "storage_iops": "{/literal}{$addonLang.storage_iops}{literal}",
        "read": "{/literal}{$addonLang.read}{literal}",
        "write": "{/literal}{$addonLang.write}{literal}",
        "mount": "{/literal}{$addonLang.mount}{literal}",
        "unmount": "{/literal}{$addonLang.unmount}{literal}",
        "install": "{/literal}{$addonLang.install}{literal}",
    };
{/literal}
</script>

<style>
    .pt-5{
        padding-top:5px;
    }
    .pt-10{
        padding-top:10px;
    }
    .pt-20{
        padding-top:20px;
    }
    .w200{
        width:200px;
    }
    .plot-wrapper{
        position:relative;
    }
    #domain>.row:first-child{
        display:none;
    }
</style>

<div class="alert alert-danger alert-dismissible" role="alert" data-error-alert style="display:none;">
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
    </button>
    <div data-error-messsage></div>
</div>

<div class="row">
    <div class="col-md-12 text-left">
        <h4>{$addonLang.service_information} <span data-loader>&nbsp;&nbsp;<i class="fa fa-spinner fa-pulse" aria-hidden="true"></i></span></h4>
        <div class="service-info">
            <div class="row">
                <div class="col-md-6 text-left">
                    
                    <div class="row">
                        <div class="col-md-5 text-left">
                            <span class=""><strong>{$addonLang.state}:</strong></span>
                        </div>
                        <div class="col-md-7 text-left">
                            <span class="" data-service-state>-</span>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-5 text-left">
                            <span class=""><strong>{$addonLang.cpu}:</strong></span>
                        </div>
                        <div class="col-md-7 text-left">
                            <span class="" data-service-cpu>-</span>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-5 text-left">
                            <span class=""><strong>{$addonLang.template}:</strong></span>
                        </div>
                        <div class="col-md-7 text-left">
                            <span class="" data-service-template>-</span>
                        </div>
                    </div>

                    <div class="row" data-mountediso-row style="display:none;">
                        <div class="col-md-5 text-left">
                            <span class=""><strong>{$addonLang.mounted_iso}:</strong></span>
                        </div>
                        <div class="col-md-7 text-left">
                            <span class="" data-service-mountediso>-</span>
                        </div>
                    </div>

                </div>
                <div class="col-md-6 text-left">
                        
                        <div class="row">
                            <div class="col-md-5 text-left">
                                <span class=""><strong>{$addonLang.ram}:</strong></span>
                            </div>
                            <div class="col-md-7 text-left">
                                <span class="" data-service-ram>-</span>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-5 text-left">
                                <span class=""><strong>{$addonLang.service_login}:</strong></span>
                            </div>
                            <div class="col-md-7 text-left">
                                <span class="" data-service-server>-</span>
                            </div>
                        </div>

                </div>
            </div>
        </div>
    </div>
</div>
<br>
<div class="row">
    <div class="col-md-12 text-left">
        <h4>{$addonLang.actions}</h4>
        <div class="actions">
            <button class="btn btn-default" data-btn-start data-btn-lockable onclick="H1P_cloud.service_start()" disabled>{$addonLang.start}</button>
            <button class="btn btn-default" data-btn-stop data-btn-lockable onclick="H1P_cloud.service_stop()" disabled>{$addonLang.stop}</button>
            <button class="btn btn-default" data-btn-restart data-btn-lockable onclick="H1P_cloud.service_restart()" disabled>{$addonLang.restart}</button>
            <button class="btn btn-default" data-btn-vnc data-btn-lockable onclick="H1P_cloud.service_loadConsole()" disabled data-toggle="modal" data-target="#vnc_modal">{$addonLang.console}</button>
            <button class="btn btn-default" data-btn-tasklog data-toggle="modal" data-target="#tasklog_modal">{$addonLang.task_log}</button>
        </div>
        <div class="actions pt-5">
            <button class="btn btn-default" data-btn-changehostname data-btn-lockable data-toggle="modal" data-target="#changehostname_modal">{$addonLang.change_hostname}</button>
            <button class="btn btn-default" data-btn-resetPw data-btn-lockable onclick="H1P_cloud.service_reset_pw()" disabled>{$addonLang.reset_password}</button>
            <button class="btn btn-default" data-btn-resetPw data-btn-lockable onclick="H1P_cloud.service_load_templates()" data-toggle="modal" data-target="#reinstall_modal" disabled>{$addonLang.reinstall}</button>
            <button class="btn btn-default" data-btn-network data-toggle="modal" data-target="#network_modal">{$addonLang.additional_ips}</button>
        </div>
        <div class="actions pt-5">
            <button class="btn btn-default" data-btn-upgrade data-btn-lockable onclick="" data-toggle="modal" data-target="#upgrade_modal">{$addonLang.upgrade}</button>
        </div>
    </div>
</div>

<br>
<div class="row">
    <div class="col-md-12 text-left pt-10">
        <h4>{$addonLang.storage}</h4>
        <div class="actions">
            <table class="table">
                <thead>
                    <th>{$addonLang.name}</th>
                    <th>{$addonLang.size}</th>
                    <th>{$addonLang.actions}</th>
                </thead>
                <tbody data-storage-list>
                    <tr data-schedule-loader>
                        <td colspan="3">
                            <i class="fa fa-spinner fa-pulse" aria-hidden="true"></i>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="row">
    <div class="col-md-12 text-left pt-10">
        <h4>{$addonLang.backup_schedules}</h4>
        <div class="actions">
            <table class="table">
                <thead>
                    <th>{$addonLang.storage}</th>
                    <th>{$addonLang.type}</th>
                    <th>{$addonLang.time} (UTC)</th>
                    <th>{$addonLang.actions}</th>
                </thead>
                <tbody data-schedules-list>
                    <tr data-schedule-loader>
                        <td colspan="4">
                            <i class="fa fa-spinner fa-pulse" aria-hidden="true"></i>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="row">
    <div class="col-md-12 text-left pt-10">
        <h4>{$addonLang.backups}</h4>
        <div class="actions">
            <table class="table">
                <thead>
                    <th>{$addonLang.name}</th>
                    <th>{$addonLang.size}</th>
                    <th>{$addonLang.date}</th>
                    <th>{$addonLang.actions}</th>
                </thead>
                <tbody data-backups-list>
                    <tr data-schedule-loader>
                        <td colspan="4">
                            <i class="fa fa-spinner fa-pulse" aria-hidden="true"></i>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="row">
    <div class="col-md-12 text-left pt-10">
        <h4>{$addonLang.custom_iso}</h4>
        <div class="actions">
            <table class="table">
                <thead>
                    <th>{$addonLang.name}</th>
                    <th>{$addonLang.status}</th>
                    <th>{$addonLang.date}</th>
                    <th>{$addonLang.actions}</th>
                </thead>
                <tbody data-isos-list>
                    <tr data-isos-loader>
                        <td colspan="4">
                            <i class="fa fa-spinner fa-pulse" aria-hidden="true"></i>
                        </td>
                    </tr>
                </tbody>
            </table>
            <div class="">
                <button class="btn btn-default" data-btn-upload-iso data-btn-lockable data-toggle="modal" data-target="#uploadiso_modal">{$addonLang.upload_iso}</button>
            </div>
        </div>
    </div>
</div>

<div id="uploadiso_modal" class="modal" tabindex="-1" role="dialog" data-uploadiso-modal>
    <div class="modal-dialog" role="document">
        <div class="modal-content">
        <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
                </button>
            <h3 class="modal-title">{$addonLang.upload_iso}</h3>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label for="isourlinput">{$addonLang.url}</label>
                <input id="isourlinput" class="form-control" value=""  onpaste="H1P_cloud.iso_url_pasted()" data-isourl-input/>
            </div>

            <div class="form-group">
                <label for="isonameinput">{$addonLang.name}</label>
                <input id="isonameinput" class="form-control" value="" data-isoname-input/>
            </div>
            
            <div class="checkbox">
                <label>
                    <input type="checkbox" value="" data-bootable-input onchange="H1P_cloud.toggleOsType()">
                    {$addonLang.bootable}
                </label>
            </div>

            <div class="form-group" data-iso-os-type style="display:none;">
                <label for="isoOsType">{$addonLang.iso_os_type}</label>
                <select name="" class="form-control" id="isoOsType" data-iso-os-type-select></select>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-primary" onclick="H1P_cloud.service_uploadiso()">{$addonLang.upload_iso}</button>
            <button type="button" class="btn btn-secondary" data-dismiss="modal">{$addonLang.close}</button>
        </div>
        </div>
    </div>
</div>

<br><br>

<div class="row" style="user-select:none;">
    <div class="col-md-12 text-left pt-10">
        <h4>{$addonLang.statistics}</h4>
        <div class="actions" style="float:right;">
            <select class="form-control" onchange="H1P_cloud.stat_limit_change()" data-stats-limit>
                <option value="h">Last hour</option>
                <option value="2d">Last 2 days</option>
                <option value="30d">Last 30 days</option>
            </select>
        </div>
        <button class="btn btn-default" style="float:right;margin-right:5px;" data-stats-refresh onclick="H1P_cloud.loadStatistics();"><i class="fa fa-refresh"></i> Refresh</button>
        <div style="clear:both;"></div>

        <div class="plot-wrapper" data-plot="cpu-h">
            <canvas id="cpuChart_h"></canvas>
        </div>
        <div class="plot-wrapper" data-plot="cpu-2d" style="display:none;">
            <canvas id="cpuChart_2d"></canvas>
        </div>
        <div class="plot-wrapper" data-plot="cpu-30d" style="display:none;">
            <canvas id="cpuChart_30d"></canvas>
        </div>
        
        <div class="plot-wrapper" data-plot="network-h">
            <canvas id="networkChart_h"></canvas>
        </div>
        <div class="plot-wrapper" data-plot="network-2d" style="display:none;">
            <canvas id="networkChart_2d"></canvas>
        </div>
        <div class="plot-wrapper" data-plot="network-30d" style="display:none;">
            <canvas id="networkChart_30d"></canvas>
        </div>
        
        <div class="plot-wrapper" data-plot="storage-h">
            <canvas id="storageChart_h"></canvas>
        </div>
        <div class="plot-wrapper" data-plot="storage-2d" style="display:none;">
            <canvas id="storageChart_2d"></canvas>
        </div>
        <div class="plot-wrapper" data-plot="storage-30d" style="display:none;">
            <canvas id="storageChart_30d"></canvas>
        </div>
        
        <div class="plot-wrapper" data-plot="storageIO-h">
            <canvas id="storageIOChart_h"></canvas>
        </div>
        <div class="plot-wrapper" data-plot="storageIO-2d" style="display:none;">
            <canvas id="storageIOChart_2d"></canvas>
        </div>
        <div class="plot-wrapper" data-plot="storageIO-30d" style="display:none;">
            <canvas id="storageIOChart_30d"></canvas>
        </div>
    </div>
</div>

<div id="backup_schedule_modal" class="modal" tabindex="-1" role="dialog" data-backup-schedule-modal>
    <div class="modal-dialog" role="document">
        <div class="modal-content">
        <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
                </button>
            <h3 class="modal-title">{$addonLang.backup_schedule}</h3>
        </div>
        <div class="modal-body">
            <form>
                <div class="form-group">
                    <label for="bckInterval">{$addonLang.interval}</label>
                    <select class="form-control" name="" id="bckInterval" data-schedule-interval>
                        <option value="DAILY">{$addonLang.daily}</option>
                        <option value="WEEKLY">{$addonLang.weekly}</option>
                        <option value="MONTHLY">{$addonLang.monthly}</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="bcktime">{$addonLang.time}</label>
                    <div id="sc_DAILY" class="tab-content form-input inspectlet-sensitive" data-schedule-time data-schedule-time-DAILY>
                        <select class="keep-default form-control" style="display:inline-block;width:auto" data-select-hours>
                            <option value="0">0</option>
                        </select>
                        :
                        <select class="keep-default form-control" style="display:inline-block;width:auto" data-select-minutes>
                            <option value="0">0</option>
                        </select>
                    </div>
                    <div id="sc_WEEKLY" class="tab-content form-input inspectlet-sensitive" data-schedule-time data-schedule-time-WEEKLY style="display:none;">
                        <select class="keep-default form-control" style="display:inline-block;width:auto"  data-select-hours>
                            <option value="0">0</option>
                        </select>
                        :
                        <select class="keep-default form-control" style="display:inline-block;width:auto" data-select-minutes>
                            <option value="0">0</option>
                        </select>
                        &nbsp;&nbsp;&nbsp;
                        <select class="keep-default form-control" style="display:inline-block;width:auto" data-select-weekday>
                            <option value="1">{$addonLang.sunday}</option>
                            <option value="2">{$addonLang.monday}</option>
                            <option value="3">{$addonLang.tuesday}</option>
                            <option value="4">{$addonLang.wednesday}</option>
                            <option value="5">{$addonLang.thursday}</option>
                            <option value="6">{$addonLang.friday}</option>
                            <option value="7">{$addonLang.saturday}</option>
                        </select>
                    </div>
                    <div id="sc_MONTHLY" class="tab-content form-input inspectlet-sensitive" data-schedule-time data-schedule-time-MONTHLY style="display:none;">
                        <select class="keep-default form-control" style="display:inline-block;width:auto"  data-select-hours>
                            <option value="0">0</option>
                        </select>
                        :
                        <select class="keep-default form-control" style="display:inline-block;width:auto" data-select-minutes>
                            <option value="0">0</option>
                        </select>
                        &nbsp;&nbsp;&nbsp;
                        <select class="keep-default form-control" style="display:inline-block;width:auto" data-select-dayofmonth>
                            <option value="1">1</option>
                        </select> &nbsp;&nbsp;&nbsp;{$LANG.day_of_month}
                    </div>
                </div>
                <input type="hidden" name="" value="" data-schedule-disk-id>

                <div class="form-group">
                    <label for="bckTimeZone">{$addonLang.time_zone}</label>
                    <select class="form-control" name="" id="bckTimeZone" data-schedule-timezone>
                    </select>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-primary" onclick="H1P_cloud.create_backup_schedule()">{$addonLang.create_schedule}</button>
            <button type="button" class="btn btn-secondary" data-dismiss="modal">{$addonLang.close}</button>
        </div>
        </div>
    </div>

    <input type="hidden" name="" value="" data-restore-backup-id>
</div>

<div id="restore_modal" class="modal" tabindex="-1" role="dialog" data-restore-modal>
    <div class="modal-dialog" role="document">
        <div class="modal-content">
        <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
                </button>
            <h3 class="modal-title">{$addonLang.restore}</h3>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label for="diskToRestore">{$addonLang.select_disk}</label>
                <select name="" class="form-control" id="diskToRestore" data-restore-backup-disk>
                </select>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-primary" onclick="H1P_cloud.restore_backup()">{$addonLang.restore}</button>
            <button type="button" class="btn btn-secondary" data-dismiss="modal">{$addonLang.close}</button>
        </div>
        </div>
    </div>

    <input type="hidden" name="" value="" data-restore-backup-id>
</div>

<div id="vnc_modal" class="modal" tabindex="-1" role="dialog" data-vnc-modal>
    <div class="modal-dialog  modal-lg" role="document">
        <div class="modal-content">
        <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
                </button>
            <h3 class="modal-title">{$addonLang.console}</h3>
        </div>
        <div class="modal-body">
            <div data-vnc-wrap>
                <i class="fa fa-spinner fa-pulse" aria-hidden="true" style="font-size:30px;"></i>
            </div>
        </div>
        <div class="modal-footer">
            <a href="" target="_blank" class="btn btn-primary" data-vnc-link>Open in new tab</a>
            <button type="button" class="btn btn-secondary" data-dismiss="modal">{$addonLang.close}</button>
        </div>
        </div>
    </div>
</div>

<div id="tasklog_modal" class="modal" tabindex="-1" role="dialog" data-tasklog-modal>
    <div class="modal-dialog" role="document">
        <div class="modal-content">
        <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
                </button>
            <h3 class="modal-title">{$addonLang.task_log}</h3>
        </div>
        <div class="modal-body">
            <table class="table" data-tasklog-table>
                <thead>
                    <th>{$addonLang.state}</th>
                    <th>{$addonLang.scope}</th>
                    <th>{$addonLang.action}</th>
                    <th>{$addonLang.date}</th>
                </thead>
                <tbody data-tasklog-list>
                    <tr>
                        <td colspan="4">
                            <i class="fa fa-spinner fa-pulse" aria-hidden="true"></i>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">{$addonLang.close}</button>
        </div>
        </div>
    </div>
</div>

<div id="reinstall_modal" class="modal" tabindex="-1" role="dialog" data-reinstall-modal>
    <div class="modal-dialog" role="document">
        <div class="modal-content">
        <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
                </button>
            <h3 class="modal-title">{$addonLang.reinstall}</h3>
        </div>
        <div class="modal-body" data-reinstall-content style="display:none;">
            <div class="form-group">
                <label for="restoreTemplate">{$addonLang.select_template}</label>
                <select name="" class="form-control" id="restoreTemplate" data-reinstall-template-select></select>
            </div>
        </div>
        <div class="modal-body" data-reinstall-loader>
            <i class="fa fa-spinner fa-pulse" aria-hidden="true" style="font-size:30px;"></i>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-primary" onclick="H1P_cloud.service_reinstall_template()">{$addonLang.reinstall}</button>
            <button type="button" class="btn btn-secondary" data-dismiss="modal">{$addonLang.close}</button>
        </div>
        </div>
    </div>
</div>

<div id="network_modal" class="modal" tabindex="-1" role="dialog" data-network-modal>
    <div class="modal-dialog" role="document">
        <div class="modal-content">
        <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
                </button>
            <h3 class="modal-title">{$addonLang.additional_ips}</h3>
        </div>
        <div class="modal-body">
            <table class="table" data-tasklog-table>
                <thead>
                    <th>{$addonLang.ip}</th>
                </thead>
                <tbody data-additionalIP-list>
                    <tr>
                        <td colspan="1">
                            <i class="fa fa-spinner fa-pulse" aria-hidden="true"></i>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">{$addonLang.close}</button>
        </div>
        </div>
    </div>
</div>

<div id="changehostname_modal" class="modal" tabindex="-1" role="dialog" data-changehostname-modal>
    <div class="modal-dialog" role="document">
        <div class="modal-content">
        <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
                </button>
            <h3 class="modal-title">{$addonLang.change_hostname}</h3>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label for="hostnameinput">{$addonLang.hostname}</label>
                <input id="hostnameinput" class="form-control" value="" data-hostname-input/>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-primary" onclick="H1P_cloud.service_change_hostname()">{$addonLang.change_hostname}</button>
            <button type="button" class="btn btn-secondary" data-dismiss="modal">{$addonLang.close}</button>
        </div>
        </div>
    </div>
</div>

<script>
var selected_configs = {};
{foreach from=$configoptions item=v key=k}
    selected_configs['{$k}'] = {$v};
{/foreach}
var config_multiplier = {};

</script>

<div id="upgrade_modal" class="modal" tabindex="-1" role="dialog" data-upgrade-modal>
    <div class="modal-dialog" role="document">
        <div class="modal-content">
        <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
                </button>
            <h3 class="modal-title">{$addonLang.upgrade}</h3>
        </div>
        <div class="modal-body" style="user-select:none;">

            <div class="alert alert-danger alert-dismissible" role="alert" data-upgrade-error-alert style="display:none;">
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
                <div data-error-messsage></div>
            </div>


            <div class="row">
                <div options-loader>
                    <i class="fa fa-spinner fa-pulse" aria-hidden="true"></i>
                </div>
                <options class="col-md-6">
                </options>
                <additional-discs class="col-md-6">
                </additional-discs>
            </div>
        </div>
        <div class="modal-footer">
            <div class="" style="padding-top:3px;font-size:20px;font-weight:bold;float:left;display:none;" data-upgrade-summary>{$addonLang.upgrade_price}: <span class="" data-upgrade-total></span></div>
            <button type="button" class="btn btn-primary" onclick="H1P_cloud.service_upgrade()" data-upgrade-btn disabled>{$addonLang.upgrade}</button>
            <button type="button" class="btn btn-secondary" data-dismiss="modal">{$addonLang.close}</button>
        </div>
        </div>
    </div>
</div>

<script>
    H1P_cloud.service_load_info();
</script>