/*
    Makes API call
    param: object - [string]api object
    param: method - [string]api method
    param: data - [json string]data to pass for api
    param: additionalGETparams - [json object]data to pass as get params
*/
function H1PapiCall( object, method, data, additionalGETparams, callback_params, async ){
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
