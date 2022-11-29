var classRnd = Math.random().toString(36).slice(2);


//########################################
//_rex object; object to manage and store all data; referenced by framework object
//########################################
var _rex = function () {
  return {
    all: function () {
      return JSON.parse(JSON.stringify(this.datasets));
    },
    datasets: {
      store: {}, persistent: { "meta": { "object": "true" } }
    },
    meta: {
      history: {}
    },
    create: function (type, name, args) { return null },
    read: function () { return null },
    update: function () { return null },
    delete: function () { return null },
    alterTable: function () { return null },
    load: function (dataset) {
      this.datasets = JSON.parse(dataset)
    },
    unload: function () {
      this.datasets = { store: {} };
    },
    where: function () { return null },
    save: function () { return null }
  };
}();

//########################################
//_r object; reactive store
//########################################
var rhandler = {
  get(target, key, receiver) {
    if (typeof target[key] === 'object' && target[key] !== null) {
      return new Proxy(target[key], rhandler)
    } else {
      return Reflect.get(target, key, receiver);//is this necessary
    }
  },
  set(target, key, value, receiver) {
    return Reflect.set(target.datasets, key, value, receiver.datasets.store);
  },
  apply(target, thisArg, args) {
    return target(...args);
  }
}
const _r = new Proxy(_rex, rhandler);
//########################################

//########################################
//db object
//########################################
var dbhandler = {
  get(target, key, receiver) {
    if (typeof target[key] === 'object' && target[key] !== null) {
      return new Proxy(target[key], dbhandler)
    } else {
      return Reflect.get(target, key, receiver);
    }
  },
  set(target, key, value, receiver) {
    Reflect.set(target, key, value, receiver);
  },
  apply(target, thisArg, args) {
    return target(...args);
  }
}

var db = new Proxy(_rex, dbhandler);
//add request params (_rp) to store; store is just name value pairs
function all() { return this.data }
db.datasets.store.all = all;
db.datasets.store.meta = { "object": "true" };
db.datasets.store.data = [_rp];

db.meta.history.all = all;
db.meta.history.pointer = null;
db.meta.history.data = [];

console.log(_rex.datasets.store.data[0]);
_rex.datasets.persistent.data = (typeof _rex.datasets.store.data[0] !== 'undefined') ? _rex.datasets.store.data : [];

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//OBSERVABLE
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
class Observable {

  constructor(functionThatTakesObserver) {
    this.functionThatTakesObserver = functionThatTakesObserver;
  }

  subscribe(observer) {
    return this.functionThatTakesObserver(observer)
  }

  map(projectionFunction) {
    return new Observable(observer => {
      return this.subscribe({
        next(val) { observer.next(projectionFunction(val)) },
        error(e) { observer.error(e) },
        complete() { observer.complete() }
      });
    });
  }

  mergeMap(anotherFunctionThatThrowsValues) {
    return new Observable(observer => {
      return this.subscribe({
        next(val) {
          anotherFunctionThatThrowsValues(val).subscribe({
            next(val) { observer.next(val) },
            error(e) { observer.error(e) },
            complete() { observer.complete() }
          });
        },
        error(e) { observer.error(e) },
        complete() { observer.complete() }
      });
    });
  }

  static fromArray(array) {
    return new Observable(observer => {
      array.forEach(val => observer.next(val));
      observer.complete();
    });
  }

  static fromEvent(element, event) {
    return new Observable(observer => {
      const handler = (e) => observer.next(e);
      element.addEventListener(event, handler);
      observer.complete();
      return () => {
        element.removeEventListener(event, handler);
      };
    });
  }

  static fromPromise(promise) {
    return new Observable(observer => {
      promise.then(val => {
        observer.next(val); observer.complete();
      })
        .catch(e => {
          observer.error(val); observer.complete();
        });
    })
  }
}
//END OBSERVABLE
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//SET EVENT HANDLER FOR EACH TRIGGER
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
var triggers = document.querySelectorAll('[data-trigger]'); // All with attribute named "property"
for (let trigger of triggers) {
  var autoreset = false;
  let triggerjson = trigger.getAttribute('data-trigger');

  //INITIALIZE DATASET AND DATA FIELD
  var _ds = 'store';

  console.log('triggerjson', triggerjson);
  var obj = JSON.parse(triggerjson);
  console.log('obj', obj);

  var autoreset = 'false';

  if (typeof obj.datasource !== 'undefined') {
    _ds = obj.datasource;
  }

  for (let item of obj.triggers) {
    switch (item.type) {
      case 'download':
        break;
      case 'xhr':
        //check for callbefore and process xhr via function call
        break;
      case 'http':
        break;
      case 'change':
        let triggerChange = Observable.fromEvent(trigger, 'change');
        triggerChange.subscribe({
          next() {
            var slice = 0;
            if (Number.isInteger(_rex.meta.history.pointer) && _rex.meta.history.pointer + 1 < _rex.meta.history.data.length) {
              slice = _rex.meta.history.data.length - (_rex.meta.history.pointer + 1);
              console.log('slice: ', slice, -slice);
              _rex.meta.history.data = _rex.meta.history.data.slice(0, -slice);
            }
            var ptr = _rex.meta.history.data.length;
            console.log('WAS: ', _ds, trigger.name);
            var was = db.datasets[_ds].data[0][trigger.name];
            var historyitem = {
              datasource: _ds,
              datafield: trigger.name,
              value: trigger.value,
              was: was
            }
            _rex.meta.history.pointer = ptr;
            _rex.meta.history.data.push(historyitem);
            _rex.datasets[_ds].data[0][trigger.name] = trigger.value;

            var elements = document.querySelectorAll('.' + 'dataset-' + classRnd + '-' + _ds + '.' + 'datafield-' + classRnd + '-' + trigger.name); //trigger.name All with attribute named "property"

            for (let element of elements) {
              HydrateElement(element)
            }

          },
          error(e) { console.log(e) },
          complete() {
            //console.log('complete event---')
          }
        });


        break;
      case 'undo':
        let triggerUndo = Observable.fromEvent(trigger, 'click');
        triggerUndo.subscribe({
          next() {
            var _df;
            var ptr = Number.isInteger(_rex.meta.history.pointer) ? (_rex.meta.history.pointer > 0) ? _rex.meta.history.pointer : 0 : null;

            if (Number.isInteger(ptr)) {
              _ds = _rex.meta.history.data[ptr].datasource;
              _df = _rex.meta.history.data[ptr].datafield;
              value = _rex.meta.history.data[ptr].was;
              _rex.meta.history.pointer = ptr - 1;

              var elements = document.querySelectorAll('.' + 'dataset-' + classRnd + '-' + _ds + '.' + 'datafield-' + classRnd + '-' + _df); //trigger.name All with attribute named "property"
              _rex.datasets[_ds].data[0][_df] = value;

              for (let element of elements) {
                HydrateElement(element)
              }

              var inputs = document.querySelector('[name=' + _df + ']');
              if (typeof (inputs.length) != 'undefined') {
                for (let input of inputs) {
                  let inputjson = input.getAttribute('data-trigger');
                  var inputds = 'store';
                  for (let inputobj of JSON.parse(inputjson)) {
                    if (typeof inputobj.datasource !== 'undefined') {
                      inputds = inputobj.datasource;
                    }
                  }//end check all datasources
                  if (inputds == _ds) {
                    //match; update value
                    input.value = value;
                  }
                }//end check all inputs

              } else {
                let input = inputs;
                let inputjson = input.getAttribute('data-trigger');
                var inputds = 'store';
                var inputobj = JSON.parse(inputjson);
                if (typeof inputobj.datasource !== 'undefined') {
                  inputds = inputobj.datasource;
                }
                if (inputds == _ds) {
                  input.value = value;
                }

              }
            }

          },
          error(e) { console.log(e) },
          complete() {
            //console.log('complete event---')
          }
        });

        break;
      case 'redo':
        let triggerRedo = Observable.fromEvent(trigger, 'click');
        triggerRedo.subscribe({
          next() {
            var _df;
            var ptr = Number.isInteger(_rex.meta.history.pointer) ? (_rex.meta.history.pointer < _rex.meta.history.data.length - 2) ? _rex.meta.history.pointer + 1 : _rex.meta.history.data.length - 1 : null;

            if (Number.isInteger(ptr)) {
              _ds = _rex.meta.history.data[ptr].datasource;
              _df = _rex.meta.history.data[ptr].datafield;
              value = _rex.meta.history.data[ptr].value;
              _rex.meta.history.pointer = (ptr == _rex.meta.history.length) ? _rex.meta.history.length - 1 : ptr;

              var elements = document.querySelectorAll('.' + 'dataset-' + classRnd + '-' + _ds + '.' + 'datafield-' + classRnd + '-' + _df); //trigger.name All with attribute named "property"
              _rex.datasets[_ds].data[0][_df] = value;

              for (let element of elements) {
                HydrateElement(element)
              }

              var inputs = document.querySelector('[name=' + _df + ']');
              if (typeof (inputs.length) != 'undefined') {
                for (let input of inputs) {
                  let inputjson = input.getAttribute('data-trigger');
                  var inputds = 'store';
                  for (let inputobj of JSON.parse(inputjson)) {
                    if (typeof inputobj.datasource !== 'undefined') {
                      inputds = inputobj.datasource;
                    }
                  }//end check all datasources
                  if (inputds == _ds) {
                    input.value = value;
                  }
                }//end check all inputs

              } else {
                let input = inputs;
                let inputjson = input.getAttribute('data-trigger');
                var inputds = 'store';
                var inputobj = JSON.parse(inputjson);
                if (typeof inputobj.datasource !== 'undefined') {
                  inputds = inputobj.datasource;
                }
                if (inputds == _ds) {
                  input.value = value;
                }
              }
            }
          },
          error(e) { console.log(e) },
          complete() {
            //console.log('complete event---')
          }
        });
        break;
      case 'keyup':
        let triggerKeyup = Observable.fromEvent(trigger, 'keyup');
        triggerKeyup.subscribe({
          next() {
            var elements = document.querySelectorAll('.' + 'dataset-' + classRnd + '-' + _ds + '.' + 'datafield-' + classRnd + '-' + trigger.name); // All with attribute named "property"
            for (let element of elements) {
              if (typeof item.autoreset !== 'undefined') {
                autoreset = item.autoreset;
              }

              var observedvalue = '';
              if (autoreset == 'true' && trigger.value == '') {
                observedvalue = db.datasets[_ds].data[0][trigger.name];
              } else {
                observedvalue = trigger.value;
              }

              if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
                element.value = observedvalue;
              } else {
                element.innerHTML = observedvalue;
              }

            }

          },
          error(e) { console.log(e) },
          complete() {
            //console.log('complete event---');
          }
        });
        break;
      case 'click':
        //add xhr or redirect or reload page calls to send data to server

        //add history function somewhere around here
        let triggerClick = Observable.fromEvent(trigger, 'click');
        triggerClick.subscribe({
          next() {
            //get actions
            var cb = window[triggerobj.callbefore.function];
            var cbparams = triggerobj.callbefore.params;

            //do we need to check that cb is function
            cb(cbparams).then(
              function (response) {
                //assuming xhr call callxhr(triggerobj);
                console.log("cb Success! " + response
                );
              },
              function (error) { console.error("Failed!"); }
            )

          },
          error(e) { console.log(e) },
          complete() {
            //console.log('complete trigger click');
          }
        });
        break;
    }//end for type
  }
  //}

  //only subscribe to desired events



}//end for triggers
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

function padMax(str, max, padstr) {
  str = str.toString();
  return str.length < max ? pad(padstr + str, max) : str;
}
function padAppend(str, padlen, padstr) {
  return str.padStart(str.length + padlen, padstr);
}


//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//TODO USE INCLUDE 3109 TO GET INPUT POPULATION CODE
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
function HydrateElement(element, init = false) {
  let observe = element.getAttribute('data-observe');
  var value = '';
  var _ds = 'store';
  var _df = '';

  for (let item of JSON.parse(observe)) {

    if (typeof item.datasource !== 'undefined') {
      _ds = item.datasource;
    }
    if (typeof item.value !== 'undefined') {
      _df = item.value;
    }

    if (init && _ds != '' && _df != '') {
      element.classList.add('dataset-' + classRnd + '-' + _ds);
      element.classList.add('datafield-' + classRnd + '-' + _df);
      init = false;
    }

    switch (item.type) {
      case 'html':
        value = db.datasets[_ds].data[0][item.value];
        break;
      case 'this':
        if (!Array.isArray(item.action)) {
          item.action = [item.action];
        }
        for (let action of item.action) {
          switch (action.toLowerCase()) {
            case 'sanitize':
              value = SanitizeNumber(value);
              break;
            case 'upper':
              value = value.toUpperCase();
              break;
            case 'lower':
              value = value.toLowerCase();
              break;
          }
        }
        break;
      case 'clone':
        var elementvalue = element.value;
        var value = item.value;
        if (typeof (item.action) != 'undefined' && item.action != null) {
          elementvalue = Transform(element.value, item.action);
        }
        var clone = document.getElementById(value);

        if (typeof (clone) != 'undefined' && clone != null) {
          clone.value = elementvalue;
        } else {
          const node = document.createElement('input');
          const elId = document.createAttribute("id");
          elId.value = value;
          const elName = document.createAttribute("name");
          elName.value = value;
          const elValue = document.createAttribute("value");
          elValue.value = elementvalue;
          node.setAttributeNode(elId);
          node.setAttributeNode(elName);
          node.setAttributeNode(elValue);
          element.appendChild(node);
        }
        break;
      case 'template':

        break;
      case 'attr':
        //if {} then populate dynamically
        var attr = document.createAttribute(item.name);
        var attrPrepend = (item.prepend != null) ? item.prepend : '';
        var attrValue = db.datasets.store[item.value];
        var attrAppend = (item.append != null) ? item.append : '';
        var attrPrependPad = (item.prependpad != null) ? item.prependpad : '';
        var attrAppendPad = (item.appendpad != null) ? item.appendpad : '';

        attr.value = attrPrepend + attrPrependPad + attrValue + attrAppendPad + attrAppend;
        element.setAttributeNode(attr);
        break;
    }

  }

  //SET VALUE ONCE TO PREVENT FOIT - FLASH OF INVISIBLE TEXT
  if (value != '') {
    if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
      element.value = value;
    } else {
      element.innerHTML = value;
    }
  }
}

function SanitizeNumber(_this) {
  return _this.replace(/[^0-9]/g, '');
}

function Transform(value, actions) {
  for (let action of actions) {
    switch (action) {
      case 'sanitize':
        value = SanitizeNumber(item.value);
        break;
      case 'upper':
        value = item.value.toUpperCase();
        break;
      case 'lower':
        value = item.value.toLowerCase();
        break;
    }
  }
  return value;
}


var boltObj = function () {
  var datasets = datasets || [];

  function buildFormData(formData, data, parentKey) {
    if (data && typeof data === 'object' && !(data instanceof Date) && !(data instanceof File)) {
      Object.keys(data).forEach(key => {
        buildFormData(formData, data[key], parentKey ? `${parentKey}[${key}]` : key);
      });
    } else {
      const value = data == null ? '' : data;
      formData.append(parentKey, value);
    }
  }

  function objToFormData(data) {
    const formData = new FormData();

    buildFormData(formData, data);
    return formData;
  }

  function dbXHR() {

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///CREATE FORM OBJECT
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //add persistent data; only what is explicitly included; passing request params arbitrarily will result in unexpected consequences
    var formData = objToFormData(_rex.datasets.persistent.data[0]);

    var xhrObj = { queries: [] };

    for (let ds of _datasets.system) {
      var queryObj = { query: { name: ds, datasets: [{ dataset: ds }] } };
      xhrObj.queries.push(queryObj);
    }


    formData.append('queries', JSON.stringify(xhrObj.queries));

    for (let [name, value] of formData) {
      //alert(`${name} = ${value}`); // key1 = value1, then key2 = value2
      //console.log(`${name} = ${value}`);
    }

    var _url = "http://rock.skedmark.com/xhr";
    _xhrprocessing = true;
    xhr = new XMLHttpRequest();
    xhr.open('POST', _url, true);

    xhr.onload = function () {
      if (xhr.status === 200) {
        if (xhr.responseText.length > 0) {
          ///VALUE TO BE SUBMITTED WITH SUBSEQUENT REQUEST SO DUPLICATE PHOTOS ARE NOT CONTINUALLY ADDED TO SERVER
          try {
            var jsonObj = JSON.parse(xhr.responseText);
            for (let obj of jsonObj.root) {
              var ds = Object.keys(obj)[0];

              var data = obj[Object.keys(obj)[0]];
              var _thisDataset = Object.keys(obj)[0].replace(/-/g, "_");

              _rex.datasets[_thisDataset] = {};

              function load(dataset) {
                this.tbl = JSON.parse(sessionStorage.getItem(dataset))
              }
              function unload() {
                this.tbl = [];
              }
              function all() { return this.data }
              function where() { return null }
              function save() { return null }
              _rex.datasets[_thisDataset].all = all;


              _rex.datasets[_thisDataset].meta = { "object": "false" };
              _rex.datasets[_thisDataset].data = obj[Object.keys(obj)[0]];


              var _dataset = ds.replace(/-/g, "_");
            }
            _xhrprocessing = false;
            typeof cb === 'function' && cb(cbArguments);

          } catch (e) {
            var cleanAttempt = '{"root":[' + xhr.responseText.replace(/}{/g, "},{") + ']}';
            var cleanObj = JSON.parse(cleanAttempt)
            try {
              var jsonObj = cleanObj['root'][cleanObj['root'].length - 1];
              for (let obj of jsonObj.root) {
                addDataset(obj, Object.keys(obj)[0]);
                var _dataset = Object.keys(obj)[0].replace(/-/g, "_");
                if (obj[Object.keys(obj)[0]].length == 1) {
                  console.log('save to sessionStorage 3');
                  function all() { return obj[Object.keys(obj)[0]][0] }
                } else {
                  if (obj[Object.keys(obj)[0]].length > 0) {
                    function all() { return obj[Object.keys(obj)[0]] }
                  } else {
                    console.log('not saving to sessionStorage catch');
                  }
                }
              }
              _xhrprocessing = false;
              typeof cb === 'function' && cb(cbArguments);
            } catch (e) {
              console.format(e, 'verbose');
            }
          }

          //finally
          hydrate();
        }
      } else {
        _xhrprocessing = false;
        typeof cb === 'function' && cb(false);
      }
    };
    /// Send the Data.
    xhr.send(formData);
  }


  function hydrate() {
    //########################################################################################################################
    //START OF THE HYDRATE FUNCTIONS
    //########################################################################################################################
    var elements = document.querySelectorAll('[data-observe]'); // All with attribute named "property"
    for (let element of elements) {

      //console.log('CALL HydrateElement here');
      HydrateElement(element, true)
    }
  }
  
  function handleXHR() {

    /*
    init object
    populate persistent store 
    set event handler for xhr calls
    make xhr calls for page datasets
    process all data-observe atributes
    populate data 
      create classes to help populate reactive elements 
    update xhr calls to handle external sources


     */

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///XHR FORM DATA TO SERVER ON ELEMENT CLICK; INCLUDE DATA ATTRIBUTES AND OTHER ELEMENTS THAT CONTAIN INPUT ELEMENTS
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //$('body').on('click change', '.form-xhr, .xhr-post', function (e) {
    //  var _submit = true;
    //  var _form = _xhrpostformid;
    //  var _thisId = '#' + $(this).attr('id');


    //  if (typeof JWT !== 'undefined') {
    //    var input = $("<input>").attr({ "type": "hidden", "name": "JWT" }).val(JWT);
    //    $('#' + _form).append(input);
    //  }

    //  ///DISABLE ON CLICK AND ENABLE ON SUCCESS OR FAILURE
    //  var b_idempotent = ($(_thisId).attr('data-meta-idempotent')) ? true : false;
    //  var b_requestmessage = ($(_thisId).attr('data-requestmessage')) ? true : false;
    //  var b_responsemessage = ($(_thisId).attr('data-responsemessage')) ? true : false;
    //  var _responsemessage = ($(_thisId).attr('data-responsemessage')) ? $(_thisId).attr('data-responsemessage') : "";
    //  if (b_requestmessage) {
    //    _responsemessage = $(_thisId).attr('data-responsemessage');
    //    $(_thisId).html($(_thisId).attr('data-requestmessage'));
    //  }

    //  if (b_idempotent) {
    //    $(_thisId).prop("disabled", true);
    //  }

    //  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  ///IS THERE A MODAL
    //  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  var _modal = ($(_thisId).attr('data-meta-modal')) ? true : false;
    //  if (_modal) {
    //    var _waitmessage = ($(_thisId).data('requestmessage') != null) ? $(_thisId).data('requestmessage') : 'Please wait';
    //    var _responsemessage = ($(_thisId).data('responsemessage') != null) ? $(_thisId).data('responsemessage') : 'Success';
    //    var _failmessage = ($(_thisId).data('responsemessagefail') != null) ? $(_thisId).data('responsemessagefail') : 'Failure';
    //    var _messageselector = ($(_thisId).attr('data-meta-modal-message-selector') != null) ? $(_thisId).attr('data-meta-modal-message-selector') : '';

    //    if (typeof $('#' + $(_thisId).attr('data-meta-modal')) != "undefined") {
    //      $('.' + $(_thisId).attr('data-meta-modal-wait-selector')).html(_waitmessage);
    //      $('#' + $(_thisId).attr('data-meta-modal')).modal();
    //      //console.log('modal');
    //    } else {
    //      //console.log('no modal');
    //    }
    //  }

    //  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  ///SHOULD WE SHOW PROGRESS BAR
    //  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  var _progress = ($(_thisId).attr('data-meta-progress')) ? true : false;
    //  var _cb = ($(_thisId).attr('data-meta-callback')) ? $(_thisId).attr('data-meta-callback') : null;
    //  // find object
    //  var cb = window[_cb];

    //  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  ///IDEMPOTENT TIMESTAMP
    //  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  var input = $("<input>").attr({ "type": "hidden", "name": "idempotentstamp" }).val(moment().valueOf());
    //  $('#' + _form).append(input);

    //  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  ///VALIDATE FORMS
    //  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //  var _forms = ($(_thisId).data('meta-form')) ? JSON.parse($(_thisId).attr('data-meta-form')) : "";
    //  for (let obj of _forms) {
    //    if (!$('#' + obj.form).isValid(lang, conf, true)) {
    //      _submit = false;
    //      ///console.log('Invalid Form');
    //    }
    //  }

    //  if (_submit) {
    //    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //    ///ADD OBJECT DATA ATTRIBUTES TO FORM; DATA-META ATTRIBUTES ARE EXCLUDED
    //    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //    $.each($(_thisId).data(), function (n, v) {
    //      //console.log(n);
    //      if (!n.startsWith("meta") && n != "dismiss") {
    //        //console.log('process');
    //        ///SERIALIZE JSON OBJECTS
    //        if (n.startsWith("json")) {
    //          var input = $("<input>").attr({ "type": "hidden", "name": n.replace('json', '').toLowerCase() }).val(JSON.stringify(v));
    //          $('#' + _form).append(input);
    //        } else {
    //          var input = $("<input>").attr({ "type": "hidden", "name": n }).val(v);
    //          $('#' + _form).append(input);
    //        }
    //      }
    //    });


    //    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //    ///ADD INPUT ELEMENTS FROM ALL FORMS INDICATED
    //    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //    if (_forms != '') {
    //      $.each(_forms, function (n, v) {
    //        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //        ///CLONE ENTIRE FORM TO HIDDEN FORM
    //        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //        $('#' + v.form + ' *').filter(':input').each(function () {
    //          $(this).clone().appendTo($('#' + _form));
    //        });
    //        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //        ///ADD ANY SORTABLE ELEMENTS
    //        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //        $('#' + v.form).find('[data-include-in-form] li').each(function () {
    //          var input = $("<input>").attr({ "type": "hidden", "name": $(this).data('fieldname') }).val($(this).data('id'));
    //          $('#' + _form).append(input);
    //        });

    //        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //        ///ADD DATATABLE SELECT ELEMENTS IF WITHIN FORM
    //        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //        $('#' + v.form).find('table[data-tableselect="true"]').each(function () {
    //          var fieldname = $(this).attr('data-fieldname');
    //          var dataelement = $(this).attr('data-dataelement');
    //          var _items = [];
    //          var table = $('#' + $(this).attr('id')).DataTable();
    //          for (let i = 0; i < table.rows({ selected: true }).data().length; i++) {
    //            _items.push(table.rows({ selected: true }).data()[i][dataelement]);
    //          }
    //          var _itemsdelimited = _items.join(",");
    //          var input = $("<input>").attr({ "type": "hidden", "name": fieldname }).val(_itemsdelimited);
    //          $('#' + _form).append(input);
    //        });
    //      });
    //    }
    //    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //    ///ADD PERSISTENT ELEMENTS
    //    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //    $('#persistentData *').filter(':input').each(function () {
    //      $(this).clone().appendTo($('#' + _form));
    //    });

    //    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //    ///CALL XHR CONTROLLER
    //    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //    var formData = new FormData(document.getElementById(_form));
    //    var _url = "/xhr";
    //    var xhr = new XMLHttpRequest();
    //    xhr.open('POST', _url, true);

    //    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //    ///ADD FILES
    //    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //    ///formData.append('file', document.querySelector('#file-input_' + _value).files[0]);

    //    //////////////////////////////////////////////////////////////////////////////////////////////////////
    //    ///SHOW PROGRESS IF REQUESTED
    //    //////////////////////////////////////////////////////////////////////////////////////////////////////
    //    if (_progress) {
    //      xhr.upload.addEventListener('progress', function (e) {
    //        percent_complete = (e.loaded / e.total) * 100;

    //        var _progressselector = ($(_thisId).attr('data-meta-progress-selector')) ? $(obj).attr('data-meta-progress-selector') : "";
    //        var _progressaccuracy = ($(_thisId).attr('data-meta-progress-accuracy')) ? $(obj).attr('data-meta-progress-accuracy') : "1";
    //        var _progresscomplete = ($(_thisId).attr('data-meta-progress-complete')) ? $(obj).attr('data-meta-progress-complete') : "Complete";

    //        $('.' + _progressselector).html('').show();
    //        $('.' + _progressselector).html(Number(percent_complete).toFixed(_progressaccuracy) + '% complete');
    //        ///$('.' + _progressselector).html(Number(percent_complete).toFixed(_progressaccuracy) + '% uploaded');
    //        ///Percentage of upload completed
    //        if (percent_complete == '100') {
    //          $('.' + _progressselector).html(_progresscomplete);
    //        }
    //      });
    //    }

    //    //////////////////////////////////////////////////////////////////////////////////////////////////////
    //    /// SET UP A HANDLER FOR WHEN THE REQUEST FINISHES
    //    //////////////////////////////////////////////////////////////////////////////////////////////////////
    //    xhr.onload = function () {
    //      if (xhr.status === 200) {
    //        if (xhr.responseText.length > 0) {

    //          ///VALUE TO BE SUBMITTED WITH SUBSEQUENT REQUEST SO DUPLICATE PHOTOS ARE NOT CONTINUALLY ADDED TO SERVER
    //          var jsonObj = JSON.parse(xhr.responseText);
    //          for (let obj of jsonObj.root) {
    //            addDataset(obj, Object.keys(obj)[0]);
    //          }

    //          $(_thisId).prop("disabled", false);
    //          if (b_responsemessage) {
    //            $(_thisId).html(_responsemessage);
    //          }
    //          //typeof cb === 'function' && cb(true);

    //          //////////////////////////////////////////////////////////////////////////////////////////////////////
    //          ///POPULATE SORTABLE APPROPRIATELY
    //          //////////////////////////////////////////////////////////////////////////////////////////////////////
    //          if (typeof $('#' + $(_thisId).attr('data-meta-modal')) != "undefined") {
    //            $('#' + _messageselector).html(_responsemessage);
    //            $('.' + $(_thisId).attr('data-meta-modal-wait-selector')).html('');
    //            $('#' + $(_thisId).attr('data-meta-modal')).modal('hide');
    //          }
    //        }
    //        typeof cb === 'function' && cb(true);

    //      } else {
    //        console.error('An error occurred!');
    //        $(_thisId).prop("disabled", false);
    //        if (b_responsemessage) {
    //          $(_thisId).html(_responsemessage);
    //        }
    //        if (_failmessage.length > 0) {
    //          $('#' + _messageselector).html(_failmessage);
    //          $('.' + $(_thisId).attr('data-meta-modal-wait-selector')).html('');
    //          $('#' + $(_thisId).attr('data-meta-modal')).modal('hide');
    //        }
    //        typeof cb === 'function' && cb(false);

    //      }
    //    };

    //    xhr.onreadystatechange = function () {
    //      if (xhr.readyState == 4 && xhr.status == 200) {
    //        if (_progress) {
    //          var _progressselector = ($(_thisId).attr('data-meta-progress-selector')) ? $(obj).attr('data-meta-progress-selector') : "";

    //          $('.' + _progressselector).html('').hide();

    //          ///GET IMAGE SELECTOR
    //          var imgSelector = $(_thisId).attr('data-meta-image-selector');//
    //          var imgId = $(_thisId).attr('data-meta-image-id');//
    //          $('#' + imgSelector).attr('src', '/assets/img/profile_photos/' + imgId + '_lg.jpg?' + new Date().getTime());
    //        }
    //      } else {
    //        ///console.log('state! ' + xhr.readyState + ' - ' + xhr.status);
    //      }
    //    }


    //    // Send the Data.
    //    xhr.send(formData);
    //    return;
    //  }


    //});
    ///END $('body').on('click', '.form-xhr'...
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  }

  function addDataset(dataset, datasetname) {
    var _match = false;
    //datasets = $.grep(datasets, function (obj) {
    //  $.each(obj, function (index) {
    //    if (index == datasetname) {
    //      _match = true;
    //    }
    //  });
    //  if (!_match) {
    //    return obj;
    //  }
    //});
    //datasets.push(dataset);
  }

  function removeDataset(datasetname) {
    var _match = false;
    //datasets = $.grep(datasets, function (obj) {
    //  $.each(obj, function (index) {
    //    if (index == datasetname) {
    //      _match = true;
    //    }
    //  });
    //  if (!_match) {
    //    return obj;
    //  }
    //});
  }

  function getDatasets() {
    return datasets;
  }

  function getDatasetByName(datasetname) {
    //var _match = false;
    //var obj = $.grep(datasets, function (obj) {
    //  $.each(obj, function (index) {
    //    if (index == datasetname) {
    //      _match = true;
    //    }
    //  });
    //  if (_match) {
    //    return obj;
    //  }
    //})[0];
    //var datasetObj = (obj == null) ? [] : obj[datasetname];
    //return datasetObj;
  }

  function handleCopyRight() {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///THIS CAN BE USED TO ALWAYS KEEP COPYRIGHT YEAR CURRENT
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //jQuery(document).ready(function () {
    //  //var currentYear = new Date().getFullYear();
    //  //var y = new Date();
    //  $('.moment-year').html(moment(new Date()).format('YYYY'));
    //});
  }

  return {
    init: function () {
      console.log('hi2');
      //handleXHR();
    },
    initCopyRight: function () {
      handleCopyRight();
    },
    GetDatasetByName: function (datasetname) {
      return getDatasetByName(datasetname);
    },
    RemoveDataset: function (datasetname) {
      return removeDataset(datasetname);
    },
    SetFont: function (font) {
      setFont(font);
    },
    CallXHR: function (xhrObj, cb) {
      ///
      _xhrprocessing = false;
      var _continue = true;
      try {
        if (_xhrprocessing && xhrObj.queries[0].query.name == 'calendar-day-view-sync') {
          ///DO NOT RUN SYNC IF XHR IS CURRENTLY BEING PROCESSED
          _continue = false;
        }
      } catch (e) {
      }
      ///ABORT RUNNING XHR IF CONTINUE = TRUE;
      if (_xhrprocessing && _continue) {
        xhr.abort();
        xhr = null;
      }

      ///WRAPPED IN IF BECAUSE SYNC SHOULD ONLY RUN IF NO OTHERPROCESS IS RUNNING
      if (_continue) {
        return handleManualXHR.apply(this, arguments);
      }
      //return handleManualXHR(xhrObj, cb);
    },
    GetDatasets: function () {
      return getDatasets();
    },
    AddDataset: function (dataset, datasetname) {
      addDataset(dataset, datasetname);
    },
    InitDB: function () {
      dbXHR.apply(this, arguments);
    },
  };
}();

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///INIT OBJECT
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
boltObj.InitDB();
