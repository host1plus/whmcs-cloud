<?php

// add Host1Plus library autoloader
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/functions.php';

// clients
use \WHMCS\Database\Capsule;
use \Host1Plus\Clients\{Transport, CloudServers as CloudClient};

// enums / interfaces
use \Host1Plus\Enums\{BillingCycles, ResponseCodes, ServiceStates, Errors};

// exceptions
use \Host1Plus\Exception\BadRequest;

// standard functions
function h1pcloud_MetaData()
{
    return [
        'DisplayName'    => 'Host1Plus Cloud Reseller Module',
        'APIVersion'     => '1.1',
        'RequiresServer' => true,
    ];
}

function h1pcloud_ConfigOptions()
{
    return [
        'productId' => [
            'FriendlyName' => 'Product ID',
            'Type'         => 'text',
            'Size'         => '20',
            'Description'  => '',
            'Default'      => ''
        ]
    ];
}

function h1pcloud_CreateAccount(array $params)
{
    // try to load H1P API Addon Module
    list($apiUrl, $apiKey, $error) = h1pcloud_getApiUrlKey();
    if ($error != '')
    {
        logModuleCall('h1pcloud', '', '', $error, '');
        return $error;
    }

    // validate current service status
    if ($params['status'] != ServiceStates::Pending && $params['status'] != ServiceStates::Cancelled && $params['status'] != ServiceStates::Terminated)
    {
        $errstr = sprintf(Errors::InvalidParameter, 'service state', ServiceStates::Pending . ',' . ServiceStates::Cancelled . ',' . ServiceStates::Terminated, $params['status']);
        logModuleCall('h1pcloud', $params['action'], $params, $errstr, '');
        return $errstr;
    }

    $validBillingCycles = [BillingCycles::Monthly, BillingCycles::Quarterly, BillingCycles::SemiAnnually, BillingCycles::Annually, BillingCycles::Biennially];

    // validate product module parameters
    if (empty($params['configoption1']))
        return h1pcloud_logErrParam($params['action'], $params, 'module Product ID', 'above 0 integer', 'none');

    // prepare and validate service parameters
    $hostname     = $params['model']->getAttribute('domain');
    $billingCycle = strtolower($params['model']->getAttribute('billingcycle'));

    if (empty($hostname))
        return h1pcloud_logErrParam($params['action'], $params, 'hostname', 'non empty string', $hostname);

    if (empty($billingCycle) || !in_array($billingCycle, $validBillingCycles))
        return h1pcloud_logErrParam($params['action'], $params, 'billing cycle', join(',', $validBillingCycles), $billingCycle);

    // validate configurable options
    if ( ($errstr = h1pcloud_validateConfigOpts($params['configoptions'])) !== true )
    {
        logModuleCall('h1pcloud', $params['action'], $params, $errstr, '');
        return $errstr;
    }

    // validate custom fields
    if (!array_key_exists('id', $params['customfields']))
        return h1pcloud_logErrParam($params['action'], $params['customfields'], 'id', '', '');

    if (empty($params['customfields']['osTemplate']))
        return h1pcloud_logErrParam($params['action'], $params['customfields'], 'osTemplate', 'non empty string', 'none');

    // prepare transport and cloud clients
    $transport   = new Transport($apiUrl, $apiKey);
    $cloudClient = new CloudClient($transport);

    // prepare cloud server creation parameters
    $createParams = [
        'productId'       => (int)$params['configoption1'],
        'hostname'        => $hostname,
        'billingCycle'    => $billingCycle,
        'cpu'             => (int)$params['configoptions']['CPU'],
        'ram'             => (int)$params['configoptions']['RAM'] * 512,
        'hdd'             => (int)$params['configoptions']['HDD'] * 10,
        'bandwidth'       => (int)$params['configoptions']['Bandwidth'],
        'ip'              => (int)$params['configoptions']['IP'],
        'backups'         => (int)$params['configoptions']['Backups'],
        'osTemplate'      => $params['customfields']['osTemplate'],
        'additionalDisks' => []
    ];

    // parse additional disks
    foreach ($params['configoptions'] as $key => $opt)
    {
        if (strpos($key, 'Additional Disk ') === false || $opt == '0')
            continue;

        $exp = explode(' ', $key);
        if (count($exp) != 3 && !is_int($exp[2]))
            continue;

        $createParams['additionalDisks'][] = [
            'key'   => (int)$exp[2],
            'value' => (int)$opt * 10
        ];
    }

    // perform request
    try
    {
        $job = $cloudClient->create($createParams);
    }
    catch (Exception $ex)
    {
        return h1pcloud_logErrAction($params['action'], $createParams, $ex);
    }

    // save received service id into custom field id
    try
    {
        $cfId = Capsule::table('tblcustomfields')->where([
            ['type', 'product'],
            ['relid', $params['packageid']],
            ['fieldname', 'id']
        ])->first();
        if (is_null($cfId))
            throw new Exception(sprintf(Errors::FindItem, 'custom field: id'));

        $updatedCfId = Capsule::table('tblcustomfieldsvalues')->where([
            ['fieldid', $cfId->id],
            ['relid', $params['serviceid']]
        ])->update(['value' => $job['id']]);
        if (!$updatedCfId)
            throw new Exception(sprintf(Errors::UpdateObject, 'custom field: id'));
    }
    catch (Exception $ex)
    {
        return h1pvps_logErrAction('custom field \'id\' update', $job, $ex);
    }

    return 'success';
}

function h1pcloud_ChangePackage(array $params)
{
    try
    {
        if (!h1pcloud_canUpgrade())
            return;
    }
    catch (Exception $ex)
    {
        unset($_SESSION['h1pcloud_upgradeParams']);
        return h1pcloud_logErrAction($params['action'], $params, $ex);
    }

    // try to load H1P API Addon Module
    list($apiUrl, $apiKey, $error) = h1pcloud_getApiUrlKey();
    if ($error != '')
    {
        logModuleCall('h1pcloud', '', '', $error, '');
        return $error;
    }

    // validate current service status
    if ($params['status'] != ServiceStates::Active && $params['status'] != ServiceStates::Suspended)
    {
        $errstr = sprintf(Errors::InvalidParameter, 'service state', ServiceStates::Active . ',' . ServiceStates::Suspended, $params['status']);
        logModuleCall('h1pcloud', $params['action'], $params, $errstr, '');
        return $errstr;
    }

    // validate configurable options
    if ( ($errstr = h1pcloud_validateConfigOpts($params['configoptions'])) !== true )
    {
        logModuleCall('h1pcloud', $params['action'], $params, $errstr, '');
        return $errstr;
    }

    // validate custom fields
    if (!array_key_exists('id', $params['customfields']))
        return h1pcloud_logErrParam($params['action'], $params['customfields'], 'id', '', '');

    // prepare transport and cloud clients
    $transport   = new Transport($apiUrl, $apiKey);
    $cloudClient = new CloudClient($transport);

    // parse and prepare cloud update parameters
    $updateParams = [
        'cpu'             => (int)$params['configoptions']['CPU'],
        'ram'             => (int)$params['configoptions']['RAM'] * 512,
        'hdd'             => (int)$params['configoptions']['HDD'] * 10,
        'bandwidth'       => (int)$params['configoptions']['Bandwidth'],
        'ip'              => (int)$params['configoptions']['IP'],
        'backups'         => (int)$params['configoptions']['Backups'],
        'additionalDisks' => [],
    ];

    h1pcloud_parseAdditionalDisks($params['configoptions'], $updateParams['additionalDisks']);

    // perform request
    try
    {
        $cloudClient->update((int)$params['customfields']['id'], $updateParams);
    }
    catch (BadRequest $ex)
    {
        $respBody = $ex->getBody();
        if (is_array($respBody) && isset($respBody['code']) && $respBody['code'] == ResponseCodes::UpgradeParamsNotProvided)
            return 'success';

        $errstr = sprintf(Errors::Action, $params['action'], get_class($ex), $ex->getMessage());
        logModuleCall('h1pcloud', $params['action'], $updateParams, $errstr, '');
        return $errstr;
    }
    catch (Exception $ex)
    {
        return h1pcloud_logErrAction($params['action'], $updateParams, $ex);
    }

    return 'success';
}

function h1pcloud_SuspendAccount(array $params)
{
    // try to load H1P API Addon Module
    list($apiUrl, $apiKey, $error) = h1pcloud_getApiUrlKey();
    if ($error != '')
    {
        logModuleCall('h1pcloud', '', '', $error, '');
        return $error;
    }

    // validate current service status
    if ($params['status'] != ServiceStates::Active && $params['status'] != ServiceStates::Suspended)
    {
        $errstr = sprintf(Errors::InvalidParameter, 'service state', ServiceStates::Active . ',' . ServiceStates::Suspended, $params['status']);
        logModuleCall('h1pcloud', $params['action'], $params, $errstr, '');
        return $errstr;
    }

    // validate custom fields
    if (!array_key_exists('id', $params['customfields']))
        return h1pcloud_logErrParam($params['action'], $params['customfields'], 'id', '', '');

    // prepare transport and cloud clients
    $transport   = new Transport($apiUrl, $apiKey);
    $cloudClient = new CloudClient($transport);

    // parse and prepare suspension parameters
    $reason = isset($params['suspendreason']) ? $params['suspendreason'] : '';

    try
    {
        $cloudClient->suspendUsage((int)$params['customfields']['id'], $reason);
    }
    catch (Exception $ex)
    {
        return h1pcloud_logErrAction($params['action'], $reason, $ex);
    }

    return 'success';
}

function h1pcloud_UnsuspendAccount(array $params)
{
    // try to load H1P API Addon Module
    list($apiUrl, $apiKey, $error) = h1pcloud_getApiUrlKey();
    if ($error != '')
    {
        logModuleCall('h1pcloud', '', '', $error, '');
        return $error;
    }

    // validate current service status
    if ($params['status'] != ServiceStates::Active && $params['status'] != ServiceStates::Suspended)
    {
        $errstr = sprintf(Errors::InvalidParameter, 'service state', ServiceStates::Active . ',' . ServiceStates::Suspended, $params['status']);
        logModuleCall('h1pcloud', $params['action'], $params, $errstr, '');
        return $errstr;
    }

    // validate custom fields
    if (!array_key_exists('id', $params['customfields']))
        return h1pcloud_logErrParam($params['action'], $params['customfields'], 'id', '', '');

    // prepare transport and cloud clients
    $transport   = new Transport($apiUrl, $apiKey);
    $cloudClient = new CloudClient($transport);

    // parse and prepare suspension parameters
    $reason = isset($params['suspendreason']) ? $params['suspendreason'] : '';

    try
    {
        $cloudClient->unsuspendUsage((int)$params['customfields']['id']);
    }
    catch (Exception $ex)
    {
        return h1pcloud_logErrAction($params['action'], $reason, $ex);
    }

    return 'success';
}

function h1pcloud_TerminateAccount(array $params)
{
    // try to load H1P API Addon Module
    list($apiUrl, $apiKey, $error) = h1pcloud_getApiUrlKey();
    if ($error != '')
    {
        logModuleCall('h1pcloud', '', '', $error, '');
        return $error;
    }

    // validate current service status
    if ($params['status'] != ServiceStates::Active && $params['status'] != ServiceStates::Suspended)
    {
        $errstr = sprintf(Errors::InvalidParameter, 'service state', ServiceStates::Active . ',' . ServiceStates::Suspended, $params['status']);
        logModuleCall('h1pcloud', $params['action'], $params, $errstr, '');
        return $errstr;
    }

    // validate custom fields
    if (!array_key_exists('id', $params['customfields']))
        return h1pcloud_logErrParam($params['action'], $params['customfields'], 'id', '', '');

    // prepare transport and cloud clients
    $transport   = new Transport($apiUrl, $apiKey);
    $cloudClient = new CloudClient($transport);

    // parse and prepare suspension parameters
    $reason = isset($params['suspendreason']) ? $params['suspendreason'] : '';

    try
    {
        $cloudClient->terminate((int)$params['customfields']['id']);
    }
    catch (Exception $ex)
    {
        return h1pcloud_logErrAction($params['action'], $reason, $ex);
    }

    return 'success';
}

function h1pcloud_AdminServicesTabFields(array $params)
{
    // validate custom fields
    if (!array_key_exists('id', $params['customfields']))
    {
        h1pcloud_logErrParam($params['action'], $params['customfields'], 'id', 'integer', '');
        return;
    }

    $id   = $params['serviceid'];
    $html = '';

    // currently these actions are only available to administrator accounts and work over WHMCS $_SESSION
    // if adminid is not found there is nothing that can be executed, so no reason to generate any additional interfaces
    if (isset($_SESSION['adminid']))
    {
        $html .= "<input class=\"btn btn-default\" type=\"button\" value=\"Start Server\" onclick=\""
                    . "if(confirm('Are you sure') == true){"
                    . "$.ajax({"
                    . "url: '/modules/addons/h1papi/cloudservers/{$id}/start',"
                    . "method: 'POST'"
                . '});}"/>';

        $html .= " <input class=\"btn btn-default\" type=\"button\" value=\"Stop Server\" onclick=\""
                    . "if(confirm('Are you sure') == true){"
                    . "$.ajax({"
                    . "url: '/modules/addons/h1papi/cloudservers/{$id}/stop',"
                    . "method: 'POST'"
                . '});}"/>';

        $html .= " <input class=\"btn btn-default\" type=\"button\" value=\"Restart Server\" onclick=\""
                    . "if(confirm('Are you sure') == true){"
                    . "$.ajax({"
                    . "url: '/modules/addons/h1papi/cloudservers/{$id}/reboot',"
                    . "method: 'POST'"
                . '});}"/>';

        $html .= '

            <div id="tasklog_modal" class="modal" tabindex="-1" role="dialog" data-tasklog-modal>
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content">
                <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                        </button>
                    <h3 class="modal-title">Task log</h3>
                </div>
                <div class="modal-body">
                    <div class="" data-tasklog-filter>
                        <div class="d-inline" style="display:inline-block;padding-right:10px;">
                            <label for="tasklog-limit">Limit: </label>
                            <input id="tasklog-limit" value="30" data-tasklog-limit size=6>
                        </div>

                        <div class="d-inline" style="display:inline-block;padding-right:10px;">
                            <label for="tasklog-state">State: </label>
                            <select id="tasklog-state" data-tasklog-state>
                                <option value="">all</option>
                                <option value="0">pending</option>
                                <option value="1">processing</option>
                                <option value="2">completed</option>
                                <option value="3">failed</option>
                            </select>
                        </div>

                        <div class="d-inline" style="display:inline-block;padding-right:10px;">
                            <label for="tasklog-action">Action: </label>
                            <input id="tasklog-action" value="" data-tasklog-action size=15>
                        </div>

                        <div class="d-inline" style="display:inline-block;padding-right:10px;">
                            <label for="tasklog-resultcode">Result code: </label>
                            <input id="tasklog-resultcode" value="" data-tasklog-resultcode size=7>
                        </div>

                        <div class="d-inline" style="display:inline-block;padding-right:10px;">
                            <label for="tasklog-sortby">Sort by: </label>
                            <select id="tasklog-sortby" data-tasklog-sortby>
                                <option value="id">ID</option>
                                <option value="resultCode">Result code</option>
                                <option value="instance">Scope</option>
                                <option value="action">Action</option>
                                <option value="state">State</option>
                            </select>
                        </div>

                        <div class="d-inline" style="display:inline-block;padding-right:10px;">
                            <label for="tasklog-sort">Sort: </label>
                            <select id="tasklog-sort" data-tasklog-sort>
                                <option value="1">Descending</option>
                                <option value="0">Ascending</option>
                            </select>
                        </div>

                        <div class="d-inline" style="display:inline-block;padding-right:10px;">
                            <button class="btn btn-sm btn-primary" type="button" onclick="loadTasks();">Reload</button>
                        </div>
                    </div>

                    <table class="table" data-tasklog-table>
                        <thead>
                            <th>ID</th>
                            <th>State</th>
                            <th>Result code</th>
                            <th>Scope</th>
                            <th>Action</th>
                            <th>Meta data</th>
                            <th>Date</th>
                        </thead>
                        <tbody data-tasklog-list>
                            <tr>
                                <td colspan="7">
                                    <i class="fa fa-spinner fa-pulse" aria-hidden="true"></i>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                </div>
                </div>
            </div>
            </div>
        ';

        $html .= "<input class=\"btn btn-default\" type=\"button\" value=\"Task log\" data-toggle=\"modal\" data-target=\"#tasklog_modal\" data-tasklog-open-btn onclick=\"loadTasks();\"/>";

        $html .= '
            <div id="reinstall_modal" class="modal" tabindex="-1" role="dialog" data-reinstall-modal>
                <div class="modal-dialog" role="document">
                    <div class="modal-content">
                    <div class="modal-header">
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                            </button>
                        <h3 class="modal-title">Reinstall</h3>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-danger alert-dismissible" role="alert" data-error-alert style="display:none;">
                            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                            <div data-error-messsage></div>
                        </div>
                        <div data-reinstall-content style="display:none;">
                            <div class="form-group">
                                <label for="restoreTemplate">Select template</label>
                                <select name="" class="form-control" id="restoreTemplate" data-reinstall-template-select></select>
                            </div>
                        </div>
                        <div data-reinstall-loader>
                            <i class="fa fa-spinner fa-pulse" aria-hidden="true" style="font-size:30px;"></i>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" onclick="service_reinstall_template()">Reinstall</button>
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                    </div>
                    </div>
                </div>
            </div>
        ';

        $html .= "<input class=\"btn btn-default\" type=\"button\" value=\"Reinstall\" data-toggle=\"modal\" data-target=\"#reinstall_modal\" onclick=\"service_load_templates()\"/>";


        $html .= " <input class=\"btn btn-default\" type=\"button\" value=\"Reset password\" onclick=\""
            . "if(confirm('Are you sure') == true){"
            . "$.ajax({"
            . "url: '/modules/addons/h1papi/cloudservers/{$id}/resetRootPass',"
            . "method: 'POST'"
        . '});}"/>';

        $html .= "<script>
            var service_id = {$id};
            var api_url = '/modules/addons/h1papi/cloudservers/';
        </script>";
        $html .= "<script src=\"/modules/servers/h1pcloud/admin_functions.js\"></script>";
    }

    return [
        'Module Commands' => $html
    ];
}

function h1pcloud_ClientArea($vars) {

    $language = 'english';
    if( isset( $_SESSION['Language'] ) && !empty( $_SESSION['Language'] ) ){
        $language = $_SESSION['Language'];
    }

    $langFilePath = __DIR__ . '/lang/' . $language . '.php';

    if (file_exists( $langFilePath )) {
        require_once($langFilePath);
    }
    else{
        require_once( __DIR__ . '/lang/english.php' );
    }

    return array(
        'templatefile' => 'clientarea',
        'vars' => [
            'addonLang' => $_lang,
            'tzlist' => DateTimeZone::listIdentifiers(DateTimeZone::ALL)
        ]
    );
}