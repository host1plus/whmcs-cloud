<?php

require_once __DIR__ . '/vendor/autoload.php';

// clients
use \WHMCS\Database\Capsule;

// enums
use Host1Plus\Enums\Errors;

function h1pcloud_getApiUrlKey()
{
    try
    {
        $addonSettings = Capsule::table('tbladdonmodules')->where('module', 'h1papi')->whereIn('setting', ['option1', 'option2'])->pluck('value', 'setting');
        if (count($addonSettings) != 2)
            return ['', '', 'Host1Plus API Addon Module is not configured: failed to retrieve API URL and Key parameters'];

        return [$addonSettings['option1'], $addonSettings['option2'], ''];
    }
    catch (Exception $ex)
    {
        return ['', '', sprintf('failed to retrieve Host1Plus API Addon Modules settings, error: %s, message: %s', get_class($ex), $ex->getMessage())];
    }
}

function h1pcloud_validateConfigOpts(array $params)
{
    if (!array_key_exists('CPU', $params))
        return sprintf(Errors::InvalidParameter, 'CPU', 'above 0', 'none');

    if (!array_key_exists('RAM', $params))
        return sprintf(Errors::InvalidParameter, 'RAM', 'above 0', 'none');

    if (!array_key_exists('HDD', $params))
        return sprintf(Errors::InvalidParameter, 'HDD', 'above 0', 'none');

    if (!array_key_exists('Bandwidth', $params))
        return sprintf(Errors::InvalidParameter, 'Bandwidth', 'integer value', 'none');

    if (!array_key_exists('IP', $params))
        return sprintf(Errors::InvalidParameter, 'IP count', 'above 0', 'none');

    if (!array_key_exists('Backups', $params))
        return sprintf(Errors::InvalidParameter, 'Backup count', 'integer value', 'none');

    return true;
}

function h1pcloud_logErrParam($action, array $params, $param, $expected, $got)
{
    $errstr = sprintf(Errors::InvalidParameter, $param, $expected, $got);
    logModuleCall('h1pcloud', $action, $params, $errstr, '');
    return $errstr;
}

function h1pcloud_logErrAction($action, $params, Exception $ex)
{
    $errstr = sprintf(Errors::Action, $action, get_class($ex), $ex->getMessage());
    logModuleCall('h1pcloud', $action, $params, $errstr, $ex);
    return $errstr;
}

function h1pcloud_parseAdditionalDisks(array $configOpts, array &$additionalDisks)
{
    foreach ($configOpts as $key => $opt)
    {
        if (strpos($key, 'Additional Disk ') === false)
            continue;

        $exp = explode(' ', $key);
        if (count($exp) != 3 && !is_int($exp[2]))
            continue;

        $additionalDisks[] = [
            'key'   => (int)$exp[2],
            'value' => (int)$opt * 10
        ];
    }
}

function h1pcloud_canUpgrade()
{
    if (isset($_SESSION['h1pcloud_upgradeParams']) && isset($_SESSION['upgradeids']))
    {
        if (count($_SESSION['upgradeids']) != count($_SESSION['h1pcloud_upgradeParams']))
            return false;
        else
        {
            $pendingCount = Capsule::table('tblupgrades')->whereIn('id', $_SESSION['upgradeids'])->where('status', 'pending')->count();
            if ($pendingCount > 1)
                return false;

            unset($_SESSION['h1pcloud_upgradeParams']);
        }
    }
    elseif (isset($_SESSION['upgradeids']))
    {
        $pendingCount = Capsule::table('tblupgrades')->whereIn('id', $_SESSION['upgradeids'])->where('status', 'pending')->count();
        if ($pendingCount > 1)
            return false;
    }

    return true;
}