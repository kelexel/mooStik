var _Ui = {Core: {}};
_Ui.Core.XHR = new Class({
    debug: false,
    siteUrl: false,
    _modules: {},
    _queue: [],
    _running: false,
    _callbacks: ['onRequest', 'onSuccess', 'onComplete', 'onFailure', 'onTimeout'],
    Implements: [Events, Options, Chain],
    initialize: function(options) {
        this.setOptions(options);
    },
    // Public method, used to register a new third party module that will need to make XHR calls thru this class.
    // A unique identifier must be supplied, plus a minimal set of (self explicit) options
    register: function(id, options) {
        this._debug('registered new object ' + id, options);
        if(this._modules[id] && console && console.log) {
            console.log('warning duplicate registration');
            return;
            false;
        }

        options = options && typeOf(options) == 'object' ? options : {};

        this._modules[id] = {};
        this._modules[id].request = false;
        this._modules[id].callbacks = {};
        this._modules[id].options = {
            'url': options.url ? options.url : false,
            'method': options.method ? options.method : 'GET',
            'timeout': options.timeout ? options.timeout : 0,
            'throttle': options.throttle ? options.throttle : 0,
            'cancel': options.cancel ? options.cancel : false
        };

        // Iterate thru each callbacks type to see if "options" contained a known event
        Array.each(this._callbacks, function(event) {
            if (options[event]) {
                // It does, set the Request options to invoke _runCallback
                this._modules[id].options[event] = this._runCallback.bind(this, id, event);
                this._modules[id].callbacks[event] = options[event];
            } else {
                // It does not, skip this event
                this._modules[id].options[event] = this._runCallback.bind(this, id, event);
                this._modules[id].callbacks[event] = false;
            }
        }, this);

        // Finally, memoize our Request object.
        this._modules[id].request = new Request.JSON(this._modules[id].options);
    },
    // Removes a module (i.e. for garbage collection)
    unRegister: function(id) {
        delete this._modules[id];
    },
    // Used by third party modules to perform a Request.JSON send()
    // Accepts a moduleId, an url, and an object containing the POST data
    post: function(id, url, data, callbacks) {
        var url = !url ? this._modules[id].options.url : url;
        data = typeOf(data) != 'object' ? {} : data;
        callbacks = callbacks && typeOf(callbacks) != 'object' ? false : callbacks;

        this._debug('performing SEND for ' + id + ' on url ' + url + ' with data ' + data);

        // Should we cancel a running request for this module ?
        this._checkCancel(id);

        // Should we throttle said request ?
        this._checkThrottle(id);

        // Store the SEND params to the _queue object
        this._queue.push({
            'id': id,
            'method': 'POST',
            'url': url,
            'data': data,
            'callbacks': callbacks
        });
        // Run the queue
        this._run();
        return this;
    },
    // Used by third party modules to perform a Request.JSON get()
    // Accepts a moduleId and an url
    get: function(id, url, callbacks) {
        var url = !url ? this._modules[id].options.url : url;
        callbacks = callbacks && typeOf(callbacks) != 'object' ? false : callbacks;

        this._debug('performing GET for ' + id + ' on url ' + url);

        // Should we cancel a running request for this module ?
        this._checkCancel(id);

        // Should we throttle said request ?
        this._checkThrottle(id);

        // Store the GET params to the _queue object
        this._queue.push({
            'id': id,
            'method': 'GET',
            'url': url,
            'callbacks': callbacks
        });
        // Run the queue
        this._run();
        return this;
    },
    _checkCancel: function(id) {
        // Get the current module-id Request instance
        var r = this._modules[id].request;

        // Get the current module-id options
        var o = this._modules[id].options;

        // And cancel if necessary
        if(o.cancel && r.isRunning()) {
            this._debug('Cancelling current request');
            r.cancel();
            this._running = false;
            this._shift();
        }
    },
    _checkThrottle: function(id) {
        // WARNING UNTESTED - PROBABLY NOT WORKING
        // Get the current time
        var t = new Date().getTime();
        // If we are not throttling, return
        if(!this._modules[id].options.throttle) return;
        else if(!this._modules[id].time) {
            // Store the current Request time
            this._modules[id].time = t;
        } else if(t < this._modules[id].time + this._modules[id].options.throttle) {
            // If the request time is < to now + options.throttle
            //this._running = false;
            this._shift();
        }
        return;
    },
    _shift: function() {
        // Shift the first element from the _queue
        Array.shift(this._queue);
        return this;
    },
    _run: function() {
        // If the _queue is empty, just return
        if(!this._queue || this._queue.length == 0 || this._running) {
            return;
        }
        // Set the running flag
        this._running = true;

        // Get the first element of the _queue
        var q = this._queue[0];

        // If by some unfortunate chance our module was unRegistered() before the _queue ran, erase this element from the _queue and run.
        if(!this._modules[q.id]) return this._shift()._run();

        // Get the request matching the current _queue element
        var r = this._modules[q.id].request;

        // Perform a .send() or .get()
        if(q.method == 'POST')
            r.send({
                'url': q.url,
                'method': 'POST',
                'data': q.data
            });
        else
            r.send({
                'url': q.url,
                'method': 'GET'
            });
    },
    _debug: function(log) {
        // Used to show debug..
        if(!this.options.debug) return;
        else if(console && console.log) console.log(log);
    },
    // General purpose callback invoker
    _runCallback: function(id, event, arg1, arg2) {
        // Get the first element in the queue
        var q = this._queue && this._queue.length > 0 ? this._queue[0] : false;

        // Check if it has an event attached to it - i.e.: a callback was passed to .get() or .send()
        if (q && q.callbacks && typeOf(q.callbacks) == 'object' && q.callbacks[event]) {
            this._debug('Found q callback for event '+event, q.callbacks[event])
            q.callbacks[event](arg1, arg2)
        }
        
        // If no "one-shot" events were found, check if the module has a default callback
        else if( this._modules && this._modules[id] && this._modules[id].callbacks[event] && typeOf(this._modules[id].callbacks[event] != 'function') ) 
            this._modules[id].callbacks[event](arg1, arg2);


        if (event == 'onSuccess' || event == 'onFailure') {
            // Remove the running flag
            this._running = false;
            return this._shift()._run();
        } else
        return;
    }
})
