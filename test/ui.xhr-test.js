  var defaultOptions = {
      cancel: false,
      method: 'GET',
      throttle: 0,
      timeout: 0,
      url: false
  };
 var testOptions = {
      'url': 'http://foo.ext',
      'method': 'GET',
      'timeout': 250,
      'throttle': 2,
      'cancel': true,
      'onComplete': function() {return true;},
      'onFailure': function() {return true;},
      'onRequest': function() {return true;},
      'onSuccess': function() {return true;},
      'onTimeout': function() {return true;}
  };

buster.testCase('_Ui.Core.XHR', {
    setUp: function(){
        this._xhrServer = sinon.fakeServer.create();
        this._testObj = new _Ui.Core.XHR();
        this._testObj.register('test', testOptions);
    },

    tearDown: function(){
        this._testObj.unRegister('test');
        refute.defined(this._testObj._modules['test']);
        delete this._testObj;
    },

    'should be a Class object': function(){
        assert.defined(_Ui.Core.XHR);
        assert.equals(typeOf(_Ui.Core.XHR), 'class' );
    },

    'should be an instantiated object': function() {
        assert.equals( typeOf(this._testObj), 'object');
    },

    'should register a new module with default options': function() {
        this._testObj.unRegister('test'); // unResiter testOptions
        refute.defined(this._testObj._modules['test']); // ensure it's unRegistered
        this._testObj.register('test'); // register ou test (empty) options instead.

        assert.defined(this._testObj._modules['test']);
        assert.defined(this._testObj._modules['test'].options);

        assert.match(this._testObj._modules['test'].options, defaultOptions);

        assert.equals(typeOf(this._testObj._modules['test'].request), 'object');
    },
    'should register a new module with custom options': function() {
        assert.defined(this._testObj._modules['test']);
        assert.defined(this._testObj._modules['test'].options);

        assert.match(this._testObj._modules['test'].options, testOptions);

        assert.equals(typeOf(this._testObj._modules['test'].request), 'object');
    },
    'should GET JSON content with no callbacks': function() {
        this._testObj.get('test', '/foo');

        assert.equals(this._xhrServer.requests.length, 1);

        assert.match(this._xhrServer.requests[0], {
            method: "GET",
            url: "/foo"
        });
    },
    'should not GET JSON content and trigger "onFailure" callback': function () {
        this._xhrServer.respondWith(
            "GET",
            "/foo",
            [404, {"content-type": "application/json"}, '']
        );

        var onFailure = this.spy();
        this._testObj.get('test', '/foo', {'onFailure': onFailure});

        assert.equals(this._xhrServer.requests.length, 1);
        assert.match(this._xhrServer.requests[0], {
            method: "GET",
            url: "/foo"
        });

        this._xhrServer.respond();
        assert.calledOnce(onFailure);

    },
    'should GET JSON content via an async onSuccess and, trigger onRequest, and onComplete callbacks': function () {
        this._xhrServer.respondWith(
            "GET",
            "/foo",
            [200, {"content-type": "application/json"}, '{"status":"ok"}']
        );

        var onRequest = this.spy();
        var onComplete = this.spy();
        var onSuccess = this.spy();
        var onFailure = this.spy();
        this._testObj.get('test', '/foo', {'onRequest': onRequest, 'onComplete': onComplete, 'onSuccess': onSuccess, 'onFailure': onFailure});

        assert.equals(this._xhrServer.requests.length, 1);
        assert.match(this._xhrServer.requests[0], {
            method: "GET",
            url: "/foo"
        });

        this._xhrServer.respond();
        assert.calledOnce(onRequest);
        assert.calledOnce(onComplete);
        refute.calledOnce(onFailure);
        assert.calledOnce(onSuccess);
        assert.equals(onSuccess.getCall(0).args[0], {
            status: 'ok'
        });
    },
    'should POST JSON content with no callbacks': function() {
        this._testObj.post('test', '/foo', {'foo': 'bar'});

        assert.equals(this._xhrServer.requests.length, 1);

        assert.match(this._xhrServer.requests[0], {
            method: "POST",
            url: "/foo?foo=bar"
        });
    },
    'should not POST JSON content and trigger "onFailure" callback': function () {
        this._xhrServer.respondWith(
            "POST",
            "/foo",
            [404, {"content-type": "application/json"}, '']
        );

        var onFailure = this.spy();
        this._testObj.post('test', '/foo', {'foo': 'bar'}, {'onFailure': onFailure});

        assert.equals(this._xhrServer.requests.length, 1);
        assert.match(this._xhrServer.requests[0], {
            method: "POST",
            url: "/foo?a=b"
        });

        this._xhrServer.respond();
        assert.calledOnce(onFailure);

    },
    'should POST JSON content via an async onSuccess and, trigger onRequest, and onComplete callbacks': function () {
        this._xhrServer.respondWith(
            "POST",
            "/foo",
            [200, {"content-type": "application/json"}, '{"status":"ok"}']
        );

        var onRequest = this.spy();
        var onComplete = this.spy();
        var onSuccess = this.spy();
        var onFailure = this.spy();
        this._testObj.post('test', '/foo', {'foo': 'bar'}, {'onRequest': onRequest, 'onComplete': onComplete, 'onSuccess': onSuccess, 'onFailure': onFailure});

        assert.equals(this._xhrServer.requests.length, 1);
        assert.match(this._xhrServer.requests[0], {
            method: "POST",
            url: "/foo?a=b"
        });

        this._xhrServer.respond();
        assert.calledOnce(onRequest);
        assert.calledOnce(onComplete);
        refute.calledOnce(onFailure);
        assert.calledOnce(onSuccess);
        assert.equals(onSuccess.getCall(0).args[0], {
            status: 'ok'
        });
    },
    'should cancel a Request if cancel is passed in the options': function() {
        this._testObj.unRegister('test'); // unResiter testOptions
        refute.defined(this._testObj._modules['test']); // ensure it's unRegistered
        this._testObj.register('test', {'cancel': true});

        assert.equals(this._testObj._modules['test'].options.cancel, true);

        this._xhrServer.respondWith(
            "POST",
            "/foo",
            [200, {"content-type": "application/json"}, '{"status":"ok"}']
        );

        // this._xhrServer.autoRespondAfter(240)
        var onSuccess1 = this.spy();
        var onSuccess2 = this.spy();
        this._testObj.post('test', '/foo', {'foo': 'bar'}, {'onSuccess': onSuccess1}); // start the first Request
        this._testObj.post('test', '/foo', {'foo': 'bar'}, {'onSuccess': onSuccess2}); // and start another one - which should cancel the first
        this._xhrServer.respond();
        refute.calledOnce(onSuccess1); // so that onSuccess1 is never called
        assert.called(onSuccess2); // but onSuccess2 gets called
    }
});