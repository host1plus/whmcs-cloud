<?php

// clients
use \WHMCS\Database\Capsule;
use \Host1Plus\Clients\{Transport, CloudServers as CloudClient};

// utilities
use \Host1Plus\Utilities\Cache;

// enums
use \Host1Plus\Enums\Errors;

function hook_h1pcloud_osTemplateList(array $params)
{
    // attempt to load $hosting and $product objects
    try
    {
        $hosting = Capsule::table('tblhosting')->where('id', $params['id'])->first();
        if (is_null($hosting))
            return;

        $product = Capsule::table('tblproducts')->where([
            ['id', $hosting->packageid],
            ['servertype', 'h1pcloud']
        ])->first();
        if (is_null($product))
            return;
    }
    catch (Exception $ex)
    {
        logActivity(sprintf('hook_h1pcloud_osTemplateList: unable to load hosting, error: %s, message: %s', get_class($ex), $ex->getMessage()));
        return;
    }

    // add Host1Plus library autoloader
    require_once __DIR__ . '/vendor/autoload.php';
    require_once __DIR__ . '/functions.php';

    // attempt to load H1P API Addon Module
    list($apiUrl, $apiKey, $error) = h1pcloud_getApiUrlKey();
    if ($error != '')
    {
        logActivity("hook_h1pcloud_osTemplateList: {$error}");
        return;
    }

    // check and validate cache directory
    try
    {
        $cacheDir  = __DIR__ . '/cache';
        Cache::InitDir($cacheDir);
    }
    catch (Exception $ex)
    {
        logActivity('hook_h1pcloud_osTemplateList: ' . sprintf(Errors::CacheInit, $ex->getMessage()));
        return;
    }

    // try to load current OS Template cache available in the direcotry
    $osTemplateCache = [];
    try
    {
        $cacheFile       = "{$cacheDir}/osTemplates.json";
        $osTemplateCache = Cache::GetContents($cacheFile);
    }
    catch (InvalidArgumentException $ex)
    {
        logActivity('hook_h1pcloud_osTemplateList: ' . sprintf(Errors::CacheAction, 'get', 'OS Template', $ex->getMessage()));
        if ($ex->getCode() != 3)
            return;
    }
    catch (Exception $ex)
    {
        logActivity('hook_h1pcloud_osTemplateList: ' . sprintf(Errors::CacheAction, 'get', 'OS Template', $ex->getMessage()));
        return;
    }

    // if data structure is invalid or cache was updated more than 24 hours ago attempt to load it from remote H1P API
    // save the newly generated cache into $cacheFile
    if (!isset($osTemplateCache['date']) || !isset($osTemplateCache['items']) || count($osTemplateCache['items']) == 0 || $osTemplateCache['date'] <= (time() - 24 * 60 * 60))
    {
        try
        {
            // prepare Transport and Vps communication clients
            $transport   = new Transport($apiUrl, $apiKey);
            $cloudClient = new CloudClient($transport);

            $osTemplateCache['items'] = $cloudClient->getTemplates((int)$product->configoption1);
        }
        catch (Exception $ex)
        {
            logActivity('hook_h1pcloud_osTemplateList: ' . sprintf(Errors::FindItemExt, 'os templates', get_class($ex), $ex->getMessage()));
            return;
        }

        try
        {
            Cache::PutContents($cacheFile, $osTemplateCache);
        }
        catch (Exception $ex)
        {
            logActivity('hook_h1pcloud_osTemplateList: ' . sprintf(Errors::CacheAction, 'save', 'OS Template', $ex->getMessage()));
        }
    }

    if (count($osTemplateCache['items']) == 0)
    {
        logActivity('hook_h1pcloud_osTemplateList: ' . sprintf(Errors::CountOjbect, 'OS Template list', 'more than one template', 0));
        return;
    }

    $osJson = json_encode($osTemplateCache['items']);
    if (json_last_error() !== JSON_ERROR_NONE)
    {
        logActivity('hook_h1pcloud_osTemplateList: ' . sprintf(Errors::EncodeJson, 'OS Template list', json_last_error_msg()));
        return;
    }

    echo "
    <script>
        $( document ).ready(function() {
            var customFields = $( 'input[name^=\"customfield\"]' );
            customFields.each(function( index ) {
                element = $( this );
                name = element.parent().prev().text()
                if (name == 'osTemplate') {
                    select = $( '<select/>' );
                    select.attr('name', element.attr('name'));
                    select.attr('id', element.attr('id'));

                    var osTemplates = {$osJson};
                    for (var key in osTemplates) {
                        $( '<option/>', { value: osTemplates[key].id, text: osTemplates[key].name } ).appendTo(select);
                    }

                    currentValue = element.attr('value')
                    if (select.find( 'option[value=\"' + currentValue + '\"]' ).length == 0) {
                        $( '<option/>', { value: currentValue, text: currentValue } ).prependTo(select);
                    }
                    select.val(currentValue);

                    element.replaceWith(select);
                }
            });
        });
    </script>
   ";
}

add_hook('AdminClientServicesTabFields', 1, 'hook_h1pcloud_osTemplateList');