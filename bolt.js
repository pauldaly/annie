/*
    init object
    init persistent store
    add request params to store for immediate use in hydrate 
    add data to persistent store manually to passs data via xhr
    xhr rest call to get all data for this page

    hydrate all dom elements 
    hydrate all templates

on initial load set any classes to easily set as reactive 
    bind dom elements; make reactive
    handle actions: upper, lower, copy, encrypt, etc. allow chained actions

    handle post forms, links, 

    what else significant is in bolt.js

//########################################
TODO
BOLT.JS
HANDLE CHANGE EVENTS: upper, lower, encrypt, sanitize, clone
HANDLE CLICK EVENTS: callbefore, xhr, callback; as promises and queued
MODALS AND TEMPLATES
UPDATES TO CRUD OBJECTS FROM LOCAL DATASETS

FRANKENSITE DESIGNER
WYSIWYG: HEADER, FOOTER, BODY, MODAL, TEMPLATES
PAGE OVERVIEW; CAN PAGES BE HIGHLIGHTED WHEN PARAMETERS REQUIRED, LIKE CLIENT GUID, TO RENDER PAGE; OR DOES THIS NEED TO BE DONE MANUALLY
  CAN PARAMETERS BE READ FROM ALL XHR CALLS ON PAGE TO SEE IF ANY NON GENERIC PARAMETERS EXIST; SESSION GUID IS AN EXAMPLE OF GENERIC

DATABASE MANAGEMENT
OBJECTS CREATE CUSTOM SCHEMA TABLES
  CRUD FOR EVERY OBJECT/TABLE
  ADMIN TO MANAGE OBJECTS: NAME/ALIAS, DATATYPE, ENCRYPT, PRIMARY KEY
    HELPER TO CREATE OBJECT FROM FORM CONTAINERS ON FRANKENSITE DESIGNER; GET ALL FIELDS, INCLUDE HIDDEN/CLONED FIELDS
    AUTO POPULATE OBJECT VALUES, OPTION TO EDIT
    ################################################################################################################################################################
    ANY XHR CALL MUST HAVE EXISTING OBJECT
    MESSAGE IF OBJECT BEING CHANGED TO NOT CAPTURE FIELD ON FORM
    FIELD DECLARED BUT NEVER USED; SHOW MESSAGE IN LAYMANS TERMS
    ################################################################################################################################################################
  INDEXES
  UI TO LINK JOIN TABLES ON PRIMARY KEY; AUTO CREATE CRUD FOR JOINED TABLES
  PROCEDURE MANAGER TO SEE ALL AVAILABLE API CALLS; CREATE NEW CUSTOM API CALL MODIFIED FROM EXISTING TO REDUCE RESULTS; AUTO INCLUDE ID

AND REALLY USE JWT
OPTION TO BUILD PAGE SERVER SIDE RATHER THAN CLIENT SIDE VIA XHR


observer to disable/enable, hide/show
  could be bool/conditional
*/
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
      store: {}, persistent: { "meta": {"object":"true"}}
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
//add request params (_requestparams) to store; store is just name value pairs
function all() { return this.data }
db.datasets.store.all = all;
db.datasets.store.meta = { "object": "true" };
//console.log('_requestparams', _requestparams);
db.datasets.store.data = [_requestparams];

db.meta.history.all = all;
db.meta.history.pointer = null;
db.meta.history.data = [];

//console.log(_rex.datasets.store.data[0]);
_rex.datasets.persistent.data = (typeof _rex.datasets.store.data[0] !== 'undefined') ? _rex.datasets.store.data  : [];
//for (let item of _persistent) {
//  _rex.datasets.persistent.data[item] = (typeof _rex.datasets.store.data[0][item] !== 'undefined') ? _rex.datasets.store.data[0][item] : '';
//}
//for (let item of _persistent) {
//  _rex.datasets.persistent[item] = _rex.datasets.store[item];
//}


/*
 takes add request params to store
 manually include persistent params 
 auto include params deemed persistent by server
 prevent duplicates

populate observe elements
create and populate any forms from data-bind/submit-xhr-post etc.
  could be populating existing values such as client overview
_rex.forms[formname].data
_rex.forms[formname].history
_rex.forms[formname].meta

include _rex.forms with post based on data-bind forms

should datasets be managed; CRUD 
like service categories to update and refresh
  changes to service category dataset should update dropdown list 
handle dataset paging
 */

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//data-observe objects reactively populate data
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

//IS THIS CODE REDUNDANT?
/*
 
var elements = document.querySelectorAll('[data-observe]'); // All with attribute named "property"
for (let element of elements) {
  //console.log('element', element);
  let observe = element.getAttribute('data-observe');
  console.log('observe', observe);

  //object could be an array of items to hydrate of which html is only one
  //need to loop over all items
  var obj = JSON.parse(observe)[0];
  console.log('obj.type', obj);
  var _store = 'store';
  if (typeof obj.src !== 'undefined') {
    _store = obj.src;
  }

  switch (obj.type) {
    case 'html':
      var field = obj.value;
      console.log(db.all());
      console.log(_store, field);
      console.log(db.datasets[_store]);
      console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
      console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
      if (db.datasets[_store].length > 1) {
        element.innerHTML = db.datasets[_store][0][field];
      } else {
        element.innerHTML = db.datasets[_store][field];
      }
      element.classList.add(obj.value);
      break;
  }
}


//end reactive watchers/observed
 */
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

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


function modifyText() {
  console.log('clicked');
}


if (false) {
//allows comments to be collapsed
//var views = document.querySelectorAll('span'); // All with attribute named "property"

//console.log(views);
//for (let view of views) {
//  views.addEventListener("click", console.log('clicked'));
//}
//let viewClick = Observable.fromEvent(views, 'click');
//viewClick.subscribe({
//  next() {
//    //get actions
//    console.log('view clicked');

//  },
//  error(e) { console.log(e) },
//  complete() {
//    //console.log('complete trigger click');
//  }
//});

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//SET EVENT HANDLER FOR EACH TRIGGER
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//var button = document.getElementById('button');
//let clicks$ = Observable.fromEvent(button, 'click').map(e => e.pageX + 'px');
////let clicks$ = Observable.fromEvent(button, 'click');//.map(e => '${e.pageX}px');

//this sets event for each object; it's not just set once for the selector 
//need event actions to be optional
//button click might do callfront before processing xhr
//var bindings = document.querySelectorAll('.bind'); // All with attribute named "property"

//MAKE the term called OBSERVED be trigger to reduce confusion between observed and observable
//data-trigger are objects that trigger events; action based on json

      /*
       call 
       nav-class-logic function
      class-state-function
      if state is disabled: set attribute
      Element.setAttribute("disabled", "");

      if state is not disabled: remove attribute
      Element.removeAttribute("disabled");
       */

      //get actions

      /*
event listener will trigger this code
loop over all views
set all views to hidden 
set target view to visible
        document.getElementById('view1').style.display = 'none';
        document.getElementById('view2').style.display = 'block';

handle nav elements 
loop over all nav elements 
handle nav elements individually or only within a container so multiple nav elements can be used

find container for nav clicked
get all nav within container
set class of clicked nav to active class
how to determine disabled, based on logic; takes priority over all other classes
how to determine visited, based on logic
how to determine enabled, based on logic



{
	"class-states": [{
		"active": "btn-spa-nav-active"
	}, {
		"enabled": "btn-spa-nav-enabled"
	}, {
		"visited": "btn-spa-nav-visited"
	}, {
		"disabled": "btn-spa-nav-disabled"
	}]
}'


{
	"class-states": {
		"active": "btn-spa-nav-active",
		"enabled": "btn-spa-nav-enabled",
		"visited": "btn-spa-nav-visited",
		"disabled": "btn-spa-nav-disabled"
	}
}

*/
}

//THIS SETS ROUTE OBSERVABLES
var routecontainers = document.querySelectorAll('[data-routecontainer]');
//console.log('routecontainers defined', typeof routecontainers, typeof routecontainers != "undefined");

if (typeof routecontainers != "undefined") {
  for (let routecontainer of routecontainers) {
    //GET CLASS CLASS STATES
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //does this need to be inside the subscriber too
    //let routecontainerjson = routecontainer.getAttribute('data-routecontainer');
    //var routecontainerobj = JSON.parse(routecontainerjson);
    //var statefunction = routecontainerobj.classstatefunction;
    //var states = routecontainerobj.classstates;
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


    var routes = routecontainer.querySelectorAll('[data-route]'); // All with attribute named "property"
    for (let route of routes) {
      //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //this all needs to be in the subscribe
      //var routeobj = route.getAttribute('data-route');
      //var target = routeobj.target;
      //configure event handler as click to target
      //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

      //can initial class state be set here outside of the nav event click function

      let routeClick = Observable.fromEvent(route, 'click');
      routeClick.subscribe({
        next() {
          let routecontainerjson = routecontainer.getAttribute('data-routecontainer');
          var routecontainerobj = JSON.parse(routecontainerjson);
          //var statefunction = routecontainerobj.classstatefunction;container should observe data state to determine styles
          var states = routecontainerobj.classstates;
          //console.log('states', states);

          /*
          if 
            state is disabled, do nothing
          else
            navigate to view and update all nav styles

          create function call option etc. for more sophisticated/custom routing logic

          */
          if (!route.hasAttribute('disabled')) {

            var routeobj = JSON.parse(route.getAttribute('data-route'));
            var targetobj = routeobj.target;
            var fullcalendarobj = routeobj.fullcalendar;

            console.log('routeobj', routeobj);
            var target;
            if (Array.isArray(targetobj)) {

              for (let targetroute of targetobj) {
                //console.log('targetroute', targetroute);
                var _ds = targetroute.condition.datasource.replace(/-/g, "_");
                var _df = targetroute.condition.datafield;
                //console.log('_ds', _ds);
                //console.log('_df', _df);
                if (typeof (db.datasets[_ds].data[0][_df]) != 'undefined') {
                  value = db.datasets[_ds].data[0][_df];
                  if (targetroute.condition.value == value) {
                    target = targetroute.name;
                    break;
                  }
                }
              }
            } else {
              target = targetobj;
            }
            //console.log('target', target);

            //DISPLAY SELECTED VIEW; HIDE ALL OTHER VIEWS
            var views = document.querySelectorAll('view');
            for (let view of views) {
              view.style.display = 'none';
            }
            var targetelement = document.getElementById(target);
            targetelement.style.display = 'block';
            //END DISPLAY SELECTED VIEW; HIDE ALL OTHER VIEWS
            if (typeof fullcalendarobj != 'undefined') {
              $('#fullcalendar').fullCalendar('render');
            }

            //if there is no class logic state function then just navigate to view selected

            var activeelement = document.querySelector('.' + states.active);

            if (activeelement != null) {
              activeelement.classList.remove(states.active);
              activeelement.classList.add(states.enabled);
            }

            route.classList.remove(states.enabled);
            route.classList.add(states.active);


            //var cb = window[routecontainerobj.classstatefunction];
            //var cbparams = route;
            //do we need to check that cb is function
            //cb(cbparams).then(
            //  function (response) {
            //    //console.log('class states', states, states.active);

            //    //only one nav btn can be active; all others must be something else
            //    //event listener only processes one element at a time so
            //    //need to set any active to something other than active
            //    //the nav btns need to listen to other evnts on the page for data changes that will trigger a check on all nav elements

            //    for (var state in states) {
            //      //console.log('state', state, states[state]);
            //      route.classList.remove(states[state]);
            //      //if (states.hasOwnProperty(state)) {
            //      //  user[k] = data[k];
            //      //}
            //    }
            //    //console.log('response.class', response.class);

            //    route.classList.add(response.class);

            //    if (typeof response.disabled != 'undefined' || response.disabled != null) {
            //      route.setAttribute("disabled", "");
            //    } else {
            //      route.removeAttribute("disabled");
            //    }

            //    //assuming xhr call callxhr(triggerobj);
            //    //console.log("cb Success! " , response);
            //  },
            //  function (error) { console.error("Failed!"); }
            //)


          }

        },
        error(e) { console.log(e) },
        complete() {
          //console.log('complete trigger click');
        }
      });

      //  for (let item of routeobj.classes) {
      //how do we handle switching classes
      //  }
    }
  }
} else {
  //process as individual nav routes located anywhere on the page layout rather than as a group
}

//triggers are things like: buttons, change input events
//this is called; or should be called on page load when dom is ready
//replicate this code when new component is added to dom
//DRY; make function that can be called on page load and dynamically when needed

var triggers = document.querySelectorAll('[data-trigger]'); // All with attribute named "property"
for (let trigger of triggers) {
  InitializeTrigger(trigger);
}//end for triggers

function InitializeTrigger(trigger) {
  var autoreset = false;
  let triggerjson = trigger.getAttribute('data-trigger');

  //var thisName = (typeof trigger.name != 'undefined') ? trigger.name : (trigger.getAttribute('id') != null) ? trigger.getAttribute('id') : 'not set';
  //console.log('triggerjson', thisName, triggerjson);

  //var item = null;;
  //try {
  //  item = JSON.parse(triggerjson);
  //} catch (e) {
  //  console.log('Invalid json');
  //  break;
  //}

  //let triggerobj = trigger.getAttribute('data-trigger');
  //var types = obj.type;
  //console.log('types', types)

  //INITIALIZE DATASET AND DATA FIELD
  var _ds = 'store';

  //console.log('triggerjson', triggerjson);
  var obj = JSON.parse(triggerjson);
  //var triggerarr = triggersobj.triggers;
  //console.log('obj', obj);
  //console.log('triggersobj', triggerarr);
  //for (let obj of triggerarr) {

  var autoreset = 'false';

  if (typeof obj.datasource !== 'undefined') {
    _ds = obj.datasource;
  }

  //this initiates all event listeners; assigns events to specific elements
  //for (let triggerevt of item) {
  for (let item of obj.triggers) {
    switch (item.type) {
      case 'download':
        break;
      case 'api':
        //check for callbefore and process xhr via function call; prepromise, postpromise
        /*
         we want event handler to trigger once this is clicked
         slots can be added via crud action and then xhr action 
         should xhr happen first so we get successful response back

        ah call slots needs to be done manually from fullcalendar render 
        this trigger is event handler that calls xhr but with element so json options can be passed and data attributes can be processed

        calling xhr manually still needs to pass object 
        can element be differentiated from json object
        call apiqueue; one for trigger and one for manual; each passes flag to indicate which type it is 
        the queue needs to accept an object with type in addition to calling object 
        apicaller needs to handle each type 
        dom element has data-trigger json and possibly attributes 
        manual call has json too, it could be the same format to make it easier with type = manual
        can handle more tha just queries and can include query alias

         */
        let triggerApi = Observable.fromEvent(trigger, 'click');
        triggerApi.subscribe({
          next() {
            var apiobject = {};
            apiobject.type = 'event';
            apiobject.object = this;
            apicontrol.start(apiobject);
          },
          error(e) { console.log(e) },
          complete() {
            //console.log('complete event---')
          }
        });

        break;
      case 'fullcalendar':
        //custom trigger just for the full calendar library
/*
 get json 
 set calendar id 
 set params via json 
 set params via any data objects [cart]
 call refetch

 */

        //var _thisServices = servicesArr.join(",");
        //calendardata = {
        //  locationguid: _locationguid,
        //  staff: _thisStaff,
        //  services: _thisServices,
        //  calendarrequest: "true",
        //  calendarfilter: "public-availabilty-get"
        //};
        //$('#fullcalendar').fullCalendar('refetchEvents');
        let triggerFC = Observable.fromEvent(trigger, 'click');
        triggerFC.subscribe({
          next() {
            //console.log('full calendar triggered');

            var _thisId = item.calendarid;
            var _thisParams = item.params;
            var _thisDataObjects = item.dataobjects;

            //if (typeof _rex.datasets[_thisDataset] == 'undefined') {
            //  _rex.datasets[_thisDataset] = {}

            //  function all() { return this.data }
            //  _rex.datasets[_thisDataset].all = all;
            //  _rex.datasets[_thisDataset].meta = { "object": "false" };
            //  _rex.datasets[_thisDataset].data = {};
            //}

            var calendardata = {};

            for (let data of _thisParams) {
              Object.keys(data).forEach(key => {
                //console.log(key, data[key]);
                calendardata[key] = data[key];
                //buildFormData(formData, data[key], parentKey ? `${parentKey}[${key}]` : key);
              });
            }

            for (let _thisDataset of _thisDataObjects) {
              //console.log('_thisDataset', _thisDataset);
              //console.log('_rex.datasets[_thisDataset]', _rex.datasets[_thisDataset].data);
              if (typeof _rex.datasets[_thisDataset] != 'undefined') {
                //for (let data of _rex.datasets[_thisDataset].data) {
                var data = _rex.datasets[_thisDataset].data;
                  console.log('data', data);
                  Object.keys(data).forEach(key => {
                    //console.log(key, data[key]);
                    //console.log('Array?', Array.isArray(data[key]));
                    if (Array.isArray(data[key])) {
                      var elements_array = data[key].join(",");
                      calendardata[key] = elements_array;
                    } else {
                      calendardata[key] = data[key];//this would pass value as array if not "joined"
                    }

                    //buildFormData(formData, data[key], parentKey ? `${parentKey}[${key}]` : key);
                  });
                //}
              }
            }

            console.log('calendardata', calendardata);
            //need jquery and fullcalendar referenced
            //$('#' + _thisId).fullCalendar('refetchEvents');
            PopulateCalendar();
            /*
             to submit xhr; need parameter name [serviceguids]
             to calculate template values; need datasource, fieldname/key value, 
             to save to object [cart]; is this array or singular value; list of service guids vs. booking date or singular staff guid
             */

          },
          error(e) { console.log(e) },
          complete() {
            //console.log('complete trigger click');
          }
        });

        break;
      case 'http':
        break;
      case 'route':
        break;
      case 'change':
        //_df can not be null or what is this field for other than to manipulate data locally
        //might need to use blur; change may not trigger unless enter is clicked; input is another option but might not work in all browsers
        //var _df = (typeof trigger.name != 'undefined') ? trigger.name : (trigger.getAttribute('id') != null) ? trigger.getAttribute('id') : null;
        //if (_df == null) {
        //  console.log('Page error: name attribute is not set');
        //  break;
        //}
        /*
         blur only helps with text and text area; changes handles blur and changes for radio, checkbox, select, date, and file
         blur, keyup and change (are there others) will update watching elements and populate datasets 
         keyup hydrates watchers directly without updating dataset 
         blur/change updates dataset and sets history of object to allow for undo
         
         */

        //CHANGE SHOULD ONLY TRIGGER WHEN THE DATA HAS CHANGED


        //console.log('PRE-INIT: WAS: ', _ds, _df, trigger.name);
        let triggerChange = Observable.fromEvent(trigger, 'change');
        triggerChange.subscribe({
          next() {

            //truncate history array from currect history pointer
            //if (typeof(_rex.meta.pointer) ==='number') {
            //if (!isNAN(_rex.meta.pointer)) {
            var slice = 0;
            if (Number.isInteger(_rex.meta.history.pointer) && _rex.meta.history.pointer + 1 < _rex.meta.history.data.length) {
              slice = _rex.meta.history.data.length - (_rex.meta.history.pointer + 1);
              //console.log('slice: ', slice, -slice);
              _rex.meta.history.data = _rex.meta.history.data.slice(0, -slice);
            }
            var ptr = _rex.meta.history.data.length;
            //console.log('WAS: ', _ds, trigger.name);
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
            //include.js options are only: upper, lower, encrypt, clone, and sanitize numbers/characters/regex

            //get all elements watching this trigger; should watch dataset/field
            var elements = document.querySelectorAll('.' + 'dataset-' + classRnd + '-' + _ds + '.' + 'datafield-' + classRnd + '-' + trigger.name); //trigger.name All with attribute named "property"
            //populate dataset/store with value;
            //_r.data[0][trigger.name] = trigger.value;
            //populate watching elements with trigger value
            //SO JUST UPDATE FIELD DIRECTLY

            for (let element of elements) {
              HydrateElement(element)
              //observedvalue = db.datasets[_ds].data[0][trigger.name];
              //observedvalue = trigger.value;
            }

          },
          error(e) { console.log(e) },
          complete() {
            //console.log('complete event---')
          }
        });


        break;
      case 'undo':
        //need to handle first element
        //move back in history if exists
        //this is a click trigger
        let triggerUndo = Observable.fromEvent(trigger, 'click');
        triggerUndo.subscribe({
          next() {
            var _df;
            //change pointer -1
            //update data to 'was' value
            var ptr = Number.isInteger(_rex.meta.history.pointer) ? (_rex.meta.history.pointer > 0) ? _rex.meta.history.pointer : 0 : null;

            if (Number.isInteger(ptr)) {
              _ds = _rex.meta.history.data[ptr].datasource;
              _df = _rex.meta.history.data[ptr].datafield;
              value = _rex.meta.history.data[ptr].was;
              //_rex.meta.history.pointer = (ptr == 0) ? 0 : ptr - 1;
              _rex.meta.history.pointer = ptr - 1;

              //include.js options are only: upper, lower, encrypt, clone, and sanitize numbers/characters/regex

              //get all elements watching this trigger; should watch dataset/field
              var elements = document.querySelectorAll('.' + 'dataset-' + classRnd + '-' + _ds + '.' + 'datafield-' + classRnd + '-' + _df); //trigger.name All with attribute named "property"
              //populate dataset/store with value;
              //console.log('undo', ptr, _ds, _df, value);
              _rex.datasets[_ds].data[0][_df] = value;

              //populate watching elements with history value
              //SO JUST UPDATE FIELD DIRECTLY
              for (let element of elements) {
                HydrateElement(element)
                //observedvalue = db.datasets[_ds].data[0][trigger.name];
                //observedvalue = trigger.value;
              }

              //SHOULD ALL INPUTS BE UPDATED BEFORE AND WATCHING ELEMENTS
              //need to also update any input fields (likely only one) to the value reset from history
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
                    //make sure this does not trigger another event followed by foit
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
                  //make sure this does not trigger another event followed by foit
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
        //move forward in history if exists
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
        //only add event listener if keyup is set
        let triggerKeyup = Observable.fromEvent(trigger, 'keyup');
        triggerKeyup.subscribe({
          next() {
            //get all elements watching this trigger; should watch dataset/field
            var elements = document.querySelectorAll('.' + 'dataset-' + classRnd + '-' + _ds + '.' + 'datafield-' + classRnd + '-' + trigger.name); // All with attribute named "property"
            //populate dataset/store with value;
            //_r[trigger.name] = trigger.value;//should this be .data
            //populate watching elements with trigger value
            //NEED TO HYDRATE BASED ON THIS ELEMENT RATHER THAN WHAT IS IN DATASET BECAUSE THIS IS A TEMPORARY VALUE UNTIL CHANGE/BLUR IS TRIGGERED
            //SO JUST UPDATE FIELD DIRECTLY

            //todo; works
            for (let element of elements) {
              if (typeof item.autoreset !== 'undefined') {
                autoreset = item.autoreset;
              }

              var observedvalue = '';
              if (autoreset == 'true' && trigger.value == '') {
                //get original value before keypress started; let this be configurable
                //auto-reset:'true/false'
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
      case 'crud':
        //console.log('wiring up crud');
        //the value crud is used as the trigger type
        //when a crud element is clicked it triggers a data change somewhere
        //could be: create, update, delete; can't see a reason to trigger on read so technically cud

        //nav container needs classes added for each datasource watched; just like other observers
        //process nav containers watching any datasources changed

        //add history function somewhere around here
        let triggerCRUD = Observable.fromEvent(trigger, 'click');
        triggerCRUD.subscribe({
          next() {

            var _thisDataset = item.targetobject;
            var _thisDataType = item.datatype;
            var _thisParameterLabel = item.paramname;
            if (typeof _rex.datasets[_thisDataset] == 'undefined') {
              _rex.datasets[_thisDataset] = {}

              function all() { return this.data }
              _rex.datasets[_thisDataset].all = all;
              _rex.datasets[_thisDataset].meta = { "object": "false" };
              _rex.datasets[_thisDataset].data = {};
            }

            /*
             to submit xhr; need parameter name [serviceguids]
             to calculate template values; need datasource, fieldname/key value, 
             to save to object [cart]; is this array or singular value; list of service guids vs. booking date or singular staff guid
             */

            //
            /*
             what about 
             staff (single)
             booking date (single) what about reserving time for a few minutes
             comments (single) but updatable
             notification preferences (single) but updatable
             */
            let key = trigger.getAttribute('data-key');
            switch (_thisDataType) {
              case 'toggle':
                //if exists, remove
                var iconelement = trigger.querySelector('#' + item.targeticon);
                var classFrom = (iconelement.classList.contains(item.classshow)) ? item.classshow : item.classhide;
                var classTo = (classFrom == item.classshow) ? item.classhide : item.classshow;
                iconelement.classList.replace(classFrom, classTo);

                var classFrom = (trigger.classList.contains(item.classactive)) ? item.classactive : item.classinert;
                var classTo = (classFrom == item.classactive) ? item.classinert : item.classactive;
                trigger.classList.replace(classFrom, classTo);

                //console.log('_rex.datasets[_thisDataset].data', _rex.datasets[_thisDataset].data);
                //console.log('_rex.datasets[_thisDataset].data', _rex.datasets[_thisDataset].data[0]);
                //console.log('key', key);
                //console.log('filtered', _rex.datasets[_thisDataset].data.length);
                if (typeof _rex.datasets[_thisDataset].data[_thisParameterLabel] != 'undefined' && _rex.datasets[_thisDataset].data[_thisParameterLabel].length > 0) {
                  //console.log('_rex.datasets[_thisDataset].data[0][_thisParameterLabel]', _rex.datasets[_thisDataset].data[0][_thisParameterLabel]);
                  var filtered = grep(_rex.datasets[_thisDataset].data[_thisParameterLabel], key, 'unique');
                  //console.log('filtered', filtered);
                  _rex.datasets[_thisDataset].data[_thisParameterLabel] = filtered;//.push(key);
                } else {
                  //var row = {};
                  //row[_thisParameterLabel] = [];
                  //row[_thisParameterLabel].push(key);
                  //console.log('row', row);
                  _rex.datasets[_thisDataset].data[_thisParameterLabel] = [];
                  _rex.datasets[_thisDataset].data[_thisParameterLabel].push(key) ;//.push(key);
                  //console.log('object', _rex.datasets[_thisDataset].data);
                  //console.log('stringify', JSON.stringify(_rex.datasets[_thisDataset].data));
                }
                break
              case 'insert':
                //always insert, like multiple products
                _rex.datasets[_thisDataset].data[_thisParameterLabel].push(key);
                break
              case 'remove':
                var filtered = grep(_rex.datasets[_thisDataset].data[_thisParameterLabel], key, 'remove');
                _rex.datasets[_thisDataset].data[_thisParameterLabel].push(key);
                break
              case 'single':
                //clear array and add this
                var iconelement = trigger.querySelector('.' + item.targeticon);
                console.log('item', item);



                var classFrom = (iconelement.classList.contains(item.classshow)) ? item.classshow : item.classhide;
                var classTo = (classFrom == item.classshow) ? item.classhide : item.classshow;
                //hide checkmark for all elements
                var elements = document.querySelectorAll('.' + item.targeticon);
                for (let element of elements) {
                  element.classList.replace(item.classshow, item.classhide);
                }
                iconelement.classList.replace(classFrom, classTo);

                //var classFrom = (trigger.classList.contains(item.classactive)) ? item.classactive : item.classinert;
                //var classTo = (classFrom == item.classactive) ? item.classinert : item.classactive;
                //trigger.classList.replace(classFrom, classTo);

                _rex.datasets[_thisDataset].data[_thisParameterLabel] = [];
                _rex.datasets[_thisDataset].data[_thisParameterLabel].push(key);
                console.log('_rex.datasets[_thisDataset].data', _rex.datasets[_thisDataset].data);
                break
              default:
            }

            /*
            INSERT/UPDATE CART DATASET THINKS
            get trigger key: serviceguid
            get target object: cart
            add to cart: 
              label (param name).(Array)[key, type, ]
              serviceguids:["F99EDDEB-5C81-4A86-A505-730C2499404F","1BEB4745-8A7D-43B9-9D42-7497CBD3C5C4"]
              productguids:["3A8E6407-82BB-4536-92C0-38A0BD0AD997","F604DB43-2308-4824-92C2-044FBD1EAE43"]
              staff:["1A624C69-FA15-4010-9FAB-2E7657899BAB"]
              booking:{"date":"", "time":"", "more":"any other details"}

              THIS IS IN THE XHR TRIGGER
              confirm button submits forms and objects (cart) 
              params sent to server include labeled arrays:
                serviceguids, productguids, staff
              and object items
                date, time, more; and their values

            var target = item.targetobject;

             */

            //get all elements watching this trigger; should watch dataset/field
            //console.log('crud triggered; call all elements watching these datasets');
            //console.log('.' + 'dataset-' + classRnd + '-' + _thisDataset);
            var elements = document.querySelectorAll('.' + 'dataset-' + classRnd + '-' + _thisDataset); //trigger.name All with attribute named "property"
            for (let element of elements) {
              //console.log('element', element);
              HydrateElement(element);
            }


            /*

            HYDRATE CART COMPONENT THINKS
             add to HydrateElement
             update hydrate to handle complex object like a component/reset component since change was made and
             update individual items; datetime
             update arrays; products
             either update entire component (which would be like updating a single inner html h2 tag)
             or find a way to surgically update only the data that has changed either by dataset or knowing if a specific datum has changed
             //handle sorting by: alpha, price, chron, etc.
             */

            //GENERIC THOUGHTS
            //get actions
            //var cb = window[triggerobj.function];

            ////do we need to check that cb is function
            //cb(elements).then(
            //  function (response) {
            //    //assuming xhr call callxhr(triggerobj);
            //    console.log("cb Success! " + response
            //    );
            //  },
            //  function (error) { console.error("Failed!"); }
            //)

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



  /*
   if click, get elements to process click

for click; check for callbefore
set cb to callbefore value
    cb(parameters).then(
      function (value) { console.log('/* code if successful continue ************************************************************ ') },
      function (error) { console.log('/* code if error ************************************************************ ') }
    );

next(){
    somePromise_that_always_succeeds()
    .then(function (result) {
      return callbefore(result);
    })
    .then(function (newResult) {
      return do_what_we_really_want_to_do_like_xhr(newResult);
    })


   */

  //THIS WAS TEST TO SET ALL ELEMENTS TO HAVE KEYUP TRIGGER; USED CLASS bind
  //let triggerKeyup = Observable.fromEvent(trigger, 'keyup');
  //triggerKeyup.subscribe({
  //  next() {
  //    //get all elements watching this trigger; should watch dataset/field
  //    var elements = document.querySelectorAll('.' + trigger.name); // All with attribute named "property"
  //    //populate dataset/store with value;
  //    _r[trigger.name] = trigger.value;
  //    //populate watching elements with trigger value
  //    for (let element of elements) {
  //      HydrateElement(element)
  //    }
  //  },
  //  error(e) { console.log(e) },
  //  complete() { console.log('complete event---') }
  //});

  //THIS WAS TEST TO SET ALL ELEMENTS TO HAVE BLUR TRIGGER
  //let triggerBlur = Observable.fromEvent(trigger, 'blur');
  //triggerBlur.subscribe({
  //  next() {
  //    var elements = document.querySelectorAll('.' + trigger.name); // All with attribute named "property"
  //    _r[trigger.name] = trigger.value;
  //    /*
  //     blurred item should be stored and set in history
  //     need function to undo and reset
  //      */
  //    for (let element of elements) {
  //      HydrateElement(element)
  //    }
  //  },
  //  error(e) { console.log(e) },
  //  complete() {
  //    //console.log('complete event...');
  //  }
  //});

}

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@


var grep = function (items, value, action) {
  //console.log('items, value, action', items, value, action)

  var filtered = []
    //len = items.length,
  switch (action) {
    case 'exists':
      for (let item of items) {
        if (item == value) {
          return true;
        }
      }
      return false;
      break;
    case 'remove':
      for (let item of items) {
        if (item != value) {
          filtered.push(item);
        }
      }
      return filtered;
      break;
    case 'unique':
      var found = false;
      for (let item of items) {
        if (item != value) {
          filtered.push(item);
        } else {
          found = true;
        }
      }
      if (!found) {
        filtered.push(value);
      }
      return filtered;
      break;
  }
}

function padMax(str, max, padstr) {
  str = str.toString();
  return str.length < max ? pad(padstr + str, max) : str;
}
function padAppend(str, padlen, padstr) {
  return str.padStart(str.length + padlen, padstr);
}

//this populates all elements watching/observing trigger elements
//so trigger element might populate specific data field; populate all elements watching that field
//store might be different datasource

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//TODO USE INCLUDE 3109 TO GET INPUT POPULATION CODE
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//hydrate is called from triggers if element is "observing" trigger; if observer is watching dataset-...-datasetlabel
function HydrateElement(element) {
  //console.log('');
  //console.log('element', element, '==============================================================');
  let observe = element.getAttribute('data-observe');
  var value = '';
  var _ds = 'store';
  var _df = '';

  //assuming multiple things can be done on item; perhaps populate then clone then set to uppercase
  for (let item of JSON.parse(observe)) {
    //console.log('OBSERVE OBJECT', item);
    //var item = JSON.parse(observe)[0];

    if (typeof item.datasource !== 'undefined') {
      //console.log('item.datasource', item);
      //console.log('item.datasource', item.datasource);
      if (Array.isArray(item.datasource)) {
        _ds = item.datasource;
      } else {
        _ds = item.datasource.replace(/-/g, "_");
      }
    }
    if (typeof item.value !== 'undefined') {
      _df = item.value;
    }

    //if dataset for element binding does not exist; perhaps not yet loaded; return/break/
    //console.log('db.datasets[_ds]', _rex.datasets[_ds])
    //if (db.datasets[_ds] != null) {

    //}

    //if (init && _ds != '' && _df != '') {
    //  element.classList.add('dataset-' + classRnd + '-' + _ds);
    //  element.classList.add('datafield-' + classRnd + '-' + _df);
    //  init = false;
    //}

    //console.log('item', item);
    //console.log('item.action', Array.isArray(item.action));

    switch (item.type) {
      case 'nav':
        var navelements = element.querySelectorAll('[data-route]'); //trigger.name All with attribute named "property"
        for (let navelement of navelements) {
          let thisroute = navelement.getAttribute('data-route');
          //console.log('thisroute', thisroute);
          var thisobj = {};//what if template JSON HAS MORE THAN ONE object
          try {
            thisobj = JSON.parse(thisroute);//what if template JSON HAS MORE THAN ONE object
          } catch (e) {
            console.log('Invalid JSON');
          }
          //console.log('thisobj', thisobj);

          if (typeof thisobj.state != 'undefined' && typeof thisobj.state.function != 'undefined') {
            var p = window[thisobj.state.function];
            p().then(
              function (response) {
                //assuming xhr call callxhr(triggerobj);
                //console.log(response);
              },
              function (error) { console.error("Failed!", error); }
            )
          }

          if (typeof thisobj.state != 'undefined' && typeof thisobj.state.condition != 'undefined') {
            //use NodeIterator.previousNode() to find container and the classes for enabled and disabled
            var _classenabled = thisobj.state.classenabled;
            var _classdisabled = thisobj.state.classdisabled;
            for (let condition of thisobj.state.condition) {
              var _ds = condition.datasource;
              var _df = condition.datafield;
              //console.log('db.datasets[_ds].data', _rex.datasets[_ds].data);
              //console.log('db.datasets[_ds].data[0]', _rex.datasets[_ds].data[0]);
              //console.log('typeof db.datasets[_ds].data[0][_df]', typeof db.datasets[_ds].data[0][_df], typeof db.datasets[_ds].data[0][_df]);
              if (typeof db.datasets[_ds].data[_df] != 'undefined' && typeof db.datasets[_ds].data[_df] == 'object') {
                //console.log('condition.operator', condition.operator);
                switch (condition.operator) {
                  case '=':
                    //when true && if doing a numerical comparison; call numerical state function
                    if (db.datasets[_ds].data[_df].length == Number(condition.count)) {
                      //console.log('going in =');
                      SetNavState(navelement, thisobj, condition);
                    }
                    break
                  case '>':
                    //console.log('going in >');
                    //when true && if doing a numerical comparison; call numerical state function
                    if (db.datasets[_ds].data[_df].length > Number(condition.count)) {
                      //console.log('SetNavState(navelement)', navelement);
                      //console.log('thisobj)', thisobj );
                      //console.log('condition)', condition);
                      SetNavState(navelement, thisobj, condition);
                    }
                    break
                  default:
                }
              } else {
                navelement.setAttribute('disabled', '');
                navelement.classList.remove(_classenabled);
                navelement.classList.add(_classdisabled);
              }

            }
          }
        }
        break;
      case 'html':
        //if array just use first element for now
        //should all datasets be set to array to work consistently?
        //set meta value object to true or false
        value = db.datasets[_ds].data[0][item.value];
        //if (db.datasets[_store].data.length > 1) {
        //  value = db.datasets[_store].data[0][item.value];
        //} else {
        //  value = db.datasets[_store].data[item.value];
        //}

        break;
      case 'this':
        //do what; actions
        //if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
        //  value = element.value;
        //} else {
        //  value = element.innerHTML;
        //}
        //console.log('value', value);
        //console.log('item.action', Array.isArray(item.action));
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

        //innerhtml only works for non input elements; need test
        //if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
        //  element.value = value;
        //} else {
        //  element.innerHTML = value;
        //}

        break;
      case 'clone':
        //value is name of new element
        var elementvalue = element.value;
        var value = item.value;
        //if any actions
        if (typeof (item.action) != 'undefined' && item.action != null) {
          elementvalue = Transform(element.value, item.action);
        } 
        var clone = document.getElementById(value);

        //If it isn't "undefined" and it isn't "null", then it exists.
        if (typeof (clone) != 'undefined' && clone != null) {
          clone.value = elementvalue;
        } else {
          const node = document.createElement('input');
          //make hidden; set id, set value
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
        //HYDRATING TEMPLATE BASED ON CONTAINER
        //console.log('HYDRATING TEMPLATE BASED ON CONTAINER');
        /*
         add options for groups; filter, separate template
        */

        //assume the template container needs to start empty; does not seem to affect list of initial items i.e. services
        //cart is updated every time cart is modified; don't want to add more than one cart template
        //may need option to "clear" if multiple template are needed
        element.innerHTML = '';

        var _target = (typeof item.target == 'undefined') ? 'dom' : item.target;//default to light dom
        var _templatename = item.name;
        //console.log(_target, _ds, _templatename);
        //_ds = item.datasource;

        var targetnode = element;
        if (_target === 'shadow') {
          targetnode = element.attachShadow({ mode: 'open' });
        }

        //loop over every record in dataset
        //console.log('');
        //console.log('_templatename', _templatename);
        //console.log(_rex.datasets[_ds]);
        const templatecss = document.getElementById(_templatename + '-css');
        if (templatecss != null) {
          var templateContentCss = templatecss.content.cloneNode(true);
          targetnode.appendChild(templateContentCss);
        }

        //console.log('ITEM OBJECT', item);
        //console.log('_rex.datasets[_ds].data', _ds, _rex.datasets[_ds].data);
        //SET TO ARRAY IF OBJECT SO LOGIC REMAINS CONSISTENT
        var templateArray = (Array.isArray(_rex.datasets[_ds].data)) ? _rex.datasets[_ds].data : [_rex.datasets[_ds].data];
        for (let row of templateArray) {
          //console.log('');
          //console.log('DATASET ROW ---', row);
          const template = document.getElementById(_templatename);
          let templateContent = document.createElement('div');
          templateContent.append(template.content.cloneNode(true));

          let attrClone;
          let attributes = Array.prototype.slice.call(template.attributes);
          while (attrClone = attributes.pop()) {
            if (attrClone.nodeName.toLocaleLowerCase() != 'id') {
            templateContent.setAttribute(attrClone.nodeName, attrClone.nodeValue);
            }
          }
          //console.log('templateContent', templateContent);

          var templateelements = templateContent.querySelectorAll('[data-observe]');
          targetnode.appendChild(templateContent);


          //var attr = document.createAttribute(thisobj.name);
          //var attrValue = row[thisobj.value];
          //attr.value = attrValue ;
          //templateelement.setAttributeNode(attr);

          //console.log('template', template);
          //console.log('templateContent', templateContent);
          //console.log('templateContent', templateContent.firstChild);
          //console.log('item.key', item.key);

          if (typeof item.key != 'undefined') {
            var attrKey = document.createAttribute('data-key');
            //var attrKey = document.createAttribute('data-' + item.key);
            attrKey.value = row[item.key];
            templateContent.setAttributeNode(attrKey);
          }

          //console.log('thisobj data observe json', thisobj);
          //console.log('thisobj KEY', item.key, row[item.key]);

          //populate each element inside template
          for (let templateelement of templateelements) {
            var _dselement = 'store';
            var _dfelement = '';

            let thisobserve = templateelement.getAttribute('data-observe');
            var thisobj = JSON.parse(thisobserve)[0];//what if template JSON HAS MORE THAN ONE object
            //console.log("templateelement ", templateelement);
            //console.log("thisobj ", thisobj);

            /*
             if there is a key in the container data-observe json for the template; auto include it as an attribute at the template root
             */
            //console.log('thisobj data observe json', item);
            //console.log('thisobj data observe json', thisobj);
            //console.log('thisobj KEY', item.key);
            //console.log('template key?', templateContent);


            //console.log(thisobj);
            if (typeof thisobj.datasource !== 'undefined') {//can this be moved outside for loop
              _ds = thisobj.datasource;
            }
            if (typeof thisobj.value !== 'undefined') {
              _df = thisobj.value;
            }

            if (typeof thisobj.datasource !== 'undefined') {
              _dselement = thisobj.datasource;
            }

            //console.log('thisobj.type', thisobj.type);
            switch (thisobj.type) {
              case 'html':
                var thisfield = thisobj.value;
                //console.log(thisfield);
                //console.log(_dselement, thisfield);
                //console.log(db.datasets[_dselement].data);
                var itemValue = '';
                var itemPrepend = (thisobj.prepend != null) ? thisobj.prepend : '';
                var itemValue = row[thisobj.value];
                var itemAppend = (thisobj.append != null) ? thisobj.append : '';
                var itemPrependPad = (thisobj.prependpad != null) ? thisobj.prependpad : '';
                var itemAppendPad = (thisobj.appendpad != null) ? thisobj.appendpad : '';

                if (db.datasets[_dselement].length > 1) {
                  itemValue = row[thisfield];
                  //templateelement.innerHTML = row[thisfield];
                } else {
                  itemValue = row[thisfield];
                  //templateelement.innerHTML = row[thisfield] + ' ---';
                }
                templateelement.innerHTML = itemPrepend + itemPrependPad + itemValue + itemAppendPad + itemAppend;
                //item.classList.add(obj.value);
                break;
              case 'attr':
                /*
                 need conditional like 
                 if value = something then use defualt
                 if no photo use /assets/img/profile_photos/photo-profile-sm.png
                 conditional

                 if (row.hasphoto == '1') {
                var conditionalOperand = row.conditional[thisobj.value];
                var conditionalOperator = //row.conditional[thisobj.value];
                var conditionalResult
                Operand and Parameter are similar; operand is input to a function


                 */
                //if {} then populate dynamically
                //console.log('ATTRIBUTE: ', row, thisobj);
                var attr = document.createAttribute(thisobj.name);
                var attrPrepend = (thisobj.prepend != null) ? thisobj.prepend : '';
                var attrValue = row[thisobj.value];
                var attrAppend = (thisobj.append != null) ? thisobj.append : '';
                var attrPrependPad = (thisobj.prependpad != null) ? thisobj.prependpad : '';
                var attrAppendPad = (thisobj.appendpad != null) ? thisobj.appendpad : '';
                var attrbustcache = (thisobj.bustcache != null && thisobj.bustcache == 'true') ? Date.now() : '';

                attr.value = attrPrepend + attrPrependPad + attrValue + attrAppendPad + attrAppend + attrbustcache;
                templateelement.setAttributeNode(attr);
                break;
              case 'function':

                //console.log("function ", thisobj.value, thisobj);
                var p = window[thisobj.value];
                var params = row;//thisobj.params;

                //do we need to check that cb is function
                p(params).then(
                  function (response) {
                    //assuming xhr call callxhr(triggerobj);
                    templateelement.innerHTML = response;
                  },
                  function (error) { console.error("Failed!"); }
                )


                //templateelement.innerHTML = "calling";
                break;
            }
          }


          //append template for each record in dataset
          //console.log(templateContent);
          targetnode.appendChild(templateContent);
          //const para = document.createElement('p');
          //para.innerHTML = 'Hi';
          //targetnode.appendChild(para);
        }

        /*
         now that template has been appended to dom
         enable event handlers



         */
        var triggers = element.querySelectorAll('[data-trigger]'); // All with attribute named "property"
        //console.log('element', triggers.length, element)
        for (let trigger of triggers) {
          InitializeTrigger(trigger);
        }//end for triggers


        break;
      case 'attr':
        //if {} then populate dynamically
        console.log('ATTRIBUTE: ', item);
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

function SetNavState(navelement, thisobj, condition) {
  //use NodeIterator.previousNode() to find container and the classes for enabled and disabled
  if (!navelement.classList.contains(thisobj.state.classactive)) {
    if (typeof condition.removeattribute != 'undefined') {
      navelement.removeAttribute(condition.removeattribute);
    }
    if (typeof condition.setattribute != 'undefined') {
      var attrvalue = '';
      if (typeof condition.setattributevalue != 'undefined') {
        attrvalue = condition.setattributevalue;
      }
      navelement.setAttribute(condition.setattribute, attrvalue);
    }
    if (condition.type == 'disabled') {
      navelement.classList.remove(thisobj.state.classenabled);
      navelement.classList.add(thisobj.state.classdisabled);
    } else {
      navelement.classList.remove(thisobj.state.classdisabled);
      navelement.classList.add(thisobj.state.classenabled);
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

//let unsubscribe = clicks$.subscribe({
//  next(val) { console.log(val) },
//  error(e) { console.log(e) },
//  complete() { console.log('complete event') }
//});

//setTimeout(() => unsubscribe(), 10000);

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//SAMPLE TO TEST OBSERVABLE ARRAY; SOMETHING HAPPENS FOR EACH ARRAY ELEMENT
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//let array$ = Observable.fromArray([1, 2, 3, 4]);
//array$.subscribe({
//  next(val) { console.log(val) },
//  error(e) { console.log(e) },
//  complete() { console.log('complete array ') }
//});
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//TEST OBSERVABLE 2 
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
class Observable2 {
  constructor(functionThatTakesObserver) {
    this._functionThatTakesObserver = functionThatTakesObserver;
  }

  subscribe(observer) {
    return this._functionThatTakesObserver(observer)
  }
}

//instance of observable
//let myObservable = new Observable(observer => {
//  setTimeout(() => {
//    observer.next("got data!")
//    observer.complete()
//  }, 5000)
//})

///*
// need key up vs blur observable
// one updates visual observers and the other updates the store 
// we don't want to update the store on every key stroke
// */

//let myObserver = {
//  next(data) {
//    console.log(data)
//  },
//  error(e) {
//    console.log(e)
//  },
//  complete() {
//    console.log("request complete")
//  }
//}

//myObservable.subscribe(myObserver)
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

var boltObj = function () {
  var _baseurl = "http://rock.skedmark.com/xhr";
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

  function getHelp() {
    var help = {};
    help.elements = [];

    helpobj = {};
    helpobj.attribute = "data-route";
    helpobj.target = "id of <view> element";

    //helpobj = { "attribute": "data-route" };
    //helpobj = { "target": "id of <view> element" };
    //helpobj = { "target": [{ "name": "target_id", "condition": { "datasource": "name of datasource to check", "datafield": "field or column of data", "value": "value of that data" } }] };
    //helpobj = { "description": "trigger to route to a single view within a SPA. Target can be a single object to link or an array with route determined by logic" };
    help.elements.push(helpobj);

    helpobj = {};
    helpobj.attribute = "data-routecontainer";
    helpobj.target = "id of container for data-route elements";
    help.elements.push(helpobj);

    return help;
  }

  function InitializeObservables() {
    //console.log('InitializeObservables() #####################################################################################################');
    return new Promise(function (success, error) {

      var elements = document.querySelectorAll('[data-observe]'); // All with attribute named "property"
      for (let element of elements) {
        //console.log('element:', element);

        let observe = element.getAttribute('data-observe');
        var _ds = 'store';
        var _df = '';

        //assuming multiple things can be done on item; perhaps populate then clone then set to uppercase
        for (let item of JSON.parse(observe)) {
          //var item = JSON.parse(observe)[0];

          if (typeof item.datasource !== 'undefined') {
            //console.log('item.datasource', item);
            //console.log('item.datasource', item.datasource);
            if (Array.isArray(item.datasource)) {
              for (let _ds of item.datasource) {
                _ds = _ds.replace(/-/g, "_");
                if (_ds != '') {//template will only have datasource and not datafield
                  element.classList.add('dataset-' + classRnd + '-' + _ds);
                }
              }
            } else {
              _ds = item.datasource.replace(/-/g, "_");
              if (_ds != '') {//template will only have datasource and not datafield
                element.classList.add('dataset-' + classRnd + '-' + _ds);
              }
            }
          }

          if (typeof item.value !== 'undefined') {
            _df = item.value;
          }

          if (_df != '') {
            element.classList.add('datafield-' + classRnd + '-' + _df);
          }
        }
      }
      success('done'); // when successful
      error();  // when error
    });

  }

  function InitialRoute() {
    //console.log('InitialRoute() #####################################################################################################');
    return new Promise(function (success, error) {
      /*
         loop over all [data-view]
         default views will have data-view attribute 
         attribute will include logic to decide which view for the route

        e.g.
        <view id="view1" data-view='{"default":"true","condition":{"datasource":"public-organization-details-get","datafield":"attacheddevice","value":"true"}}'>

        verify default is true
        process logic to true or false

        don't forget to set the nav classes
       */


      var _ds = 'store';
      var views = document.querySelectorAll('[data-view]'); // All with attribute named [this]
      for (let view of views) {
        let viewjson = view.getAttribute('data-view');

        var obj = JSON.parse(viewjson);

        //attribute should always have a default value; for now
        if (typeof obj.default !== 'undefined') {
          if (typeof obj.condition !== 'undefined') {

            if (typeof obj.condition.datasource !== 'undefined') {
              _ds = obj.condition.datasource;
              _ds = _ds.replace(/-/g, "_");
            }

            if (_rex.datasets[_ds].data[0][obj.condition.datafield] == obj.condition.value) {
              //SET NAV CLASS THEN SHOW VIEW
              //console.log('FOUND DEFAULT VIEW #####################################');
              //NAV ROUTE ##############################################################
              var routecontainers = document.querySelectorAll('[data-routecontainer]');
              //could be more than one
              if (typeof routecontainers != "undefined") {
                for (let routecontainer of routecontainers) {
                  //console.log('WORKING ROUTE CONTAINER ');
                  let routecontainerjson = routecontainer.getAttribute('data-routecontainer');
                  var routecontainerobj = JSON.parse(routecontainerjson);
                  var states = routecontainerobj.classstates;

                  var routes = routecontainer.querySelectorAll('[data-route]'); // All with attribute named "property"
                  for (let route of routes) {
                    var routeobj = JSON.parse(route.getAttribute('data-route'));
                    //console.log('WORKING NAV ROUTE ', route);
                    //if route matches initial view
                    if (Array.isArray(routeobj.target)) {
                      //this means target is conditional and points to more than one view
                      //if any of the views match the view id then set to active
                      //console.log('LOOKING FOR ', view.id);
                      for (let target of routeobj.target) {
                        //console.log('TARGET ', target.name);
                        if (target.name == view.id) {
                          route.classList.remove(states.enabled);//in case all nav routes have enabled; should all potential classes be removed
                          route.classList.add(states.active);
                          break;
                        }
                      }
                    } else {
                      //console.log('TARGET ', routeobj.target);
                      if (routeobj.target == view.id) {
                        route.classList.remove(states.enabled);//in case all nav routes have been enabled; should all potential classes be removed
                        route.classList.add(states.active);
                        break;
                      }
                    }
                  }
                }
              } else {
                //no route container so where do we get classes to use
              }
              //END NAV ROUTE ##############################################################

              view.style.display = 'block';
              break;
            }
          } else {
            //need to set nav route class here too; create function call to keep DRY
            //this is the default view and should be the one and only
            view.style.display = 'block';
          }
        }
      }
      /*
       we could error if we don't find good view
       options
       show first view element 
       if view options are set we can offer a code generated error view
       */
      success('done'); // when successful
      error();  // when error
    });

  }

  function APICall(apiobject) {
    return new Promise((resolve, reject) => {
      //replace all other xhr functions with this
      /*
       if apiobject is a string then it is likely initial setup; could use switch/unum for load, remote, and lazyload
  
  
       */
      var formData = objToFormData(_rex.datasets.persistent.data[0]);
      var _submit = true;

      //options
      //var b_idempotent = ($(_thisId).attr('data-meta-idempotent')) ? true : false;
      //if event trigger
      //if (b_idempotent) {
      //  $(_thisId).prop("disabled", true);
      //}

      //ALWAYS INCLUDE JWT
      //if (typeof JWT !== 'undefined') {
      //  var input = $("<input>").attr({ "type": "hidden", "name": "JWT" }).val(JWT);
      //  $('#' + _form).append(input);
      //}

      /*
       IF MODAL THEN THERE IS USUALLY A WAIT MESSAGE AND RETURN MESSAGE
       HANDLE PROGRESS BAR?
       INCLUDE IDEMPOTENT STAMP; MEH JUST DO IT
       CHECK FOR VALIDATION; FORM BY FORM OR SPECIFIC ELEMENTS AS INDICATED BY THIS
       JSON/ARRRAY LIKE OBJECT SHOULD BE STRINGIFIED
       FOR EACH FORM LOOP OVER AND INCLUDE EACH INPUT
            $.each(_forms, function (n, v) {
            $('#' + v.form + ' *').filter(':input').each(function () {
              $(this).clone().appendTo($('#' + _form));
            });

       ///ADD ANY SORTABLE ELEMENTS
            $('#' + v.form).find('[data-include-in-form] li').each(function () {
              var input = $("<input>").attr({ "type": "hidden", "name": $(this).data('fieldname') }).val($(this).data('id'));
              $('#' + _form).append(input);
            });

      ///ADD DATATABLE SELECT ELEMENTS IF WITHIN FORM
            $('#' + v.form).find('table[data-tableselect="true"]').each(function () {
              var fieldname = $(this).attr('data-fieldname');
              var dataelement = $(this).attr('data-dataelement');
              var _items = [];
              var table = $('#' + $(this).attr('id')).DataTable();
              for (let i = 0; i < table.rows({ selected: true }).data().length; i++) {
                _items.push(table.rows({ selected: true }).data()[i][dataelement]);
              }
              var _itemsdelimited = _items.join(",");
              var input = $("<input>").attr({ "type": "hidden", "name": fieldname }).val(_itemsdelimited);
              $('#' + _form).append(input);
            });

       SEND; LOAD; HANDLE PROGRESS
        xhr.open
        xhr.onload
        xhr.status ;https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
          Informational responses (100 – 199)
          Successful responses (200 – 299)
          Redirection messages (300 – 399)
          Client error responses (400 – 499)
          Server error responses (500 – 599)
        .readyState ;https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/readyState
          0	UNSENT	Client has been created. open() not called yet.
          1	OPENED	open() has been called.
          2	HEADERS_RECEIVED	send() has been called, and headers and status are available.
          3	LOADING	Downloading; responseText holds partial data.
          4	DONE	The operation is complete.
        xhr.responseText

    //    xhr.onreadystatechange = function () {
    //      if (xhr.readyState == 4 && xhr.status == 200) {

      onloadstart
      onprogress	
      onabort	
      onerror	
      ontimeout	
      onloadend	

       */


      console.log('APICall(apiobject)');
      console.log('apiobject', apiobject);

      var _url = _baseurl;
      var _method = "POST";//DEFAULT IS POST; USE OPTIONS TO CHANGE

      //crud always needs "queries" object with name of procedures to execute
      var xhrObj = { queries: [] };

      if (typeof apiobject == 'string') {
        //get object from dom
        if (apiobject == 'remote') {
          //######################################################################################################################
          //THIS DOES NOT ALLOW FOR MULTIPLE REMOTE CALLS, A BIT UNIQUE IN THAT SENSE; todo fix
          //uniquely, remote can make multiple api calls; should this be handled within apicontrol? and passed in as method call
          //load and lazy load are each a single call
          //######################################################################################################################
          for (let ds of _datasetsinit[apiobject]) {
            _thisDatasetRemote = ds.dataset;
            _url = ds.url;
            _method = (typeof ds.method != 'undefined') ? ds.method : _method;
          }
        }

        for (let ds of _datasetsinit[apiobject]) {
          if (typeof ds == 'string') {
            var queryObj = { query: { name: ds, datasets: [{ dataset: ds }] } };
            xhrObj.queries.push(queryObj);

          } else if (typeof ds == 'object' && typeof ds.dataset != 'undefined') {
            //{ "query": "formfield_firstname", "dataset": "firstnames" }, //example
            var queryObj = { query: { name: ds.query, datasets: [{ dataset: ds.dataset }] } };
            xhrObj.queries.push(queryObj);

          } else if (typeof ds == 'object' && typeof ds.datasets != 'undefined') {
            //{ "query": "public-get", "datasets": ["staff", "locations", "services"] }//example
            var _datasets = [];
            for (let datasetname of ds.datasets) {
              var resultset = {};
              resultset.dataset = datasetname;
              _datasets.push(resultset);
            }
            var queryObj = { query: { name: ds, datasets: _datasets } };
            xhrObj.queries.push(queryObj);
            //returns; {query:"public-get", datasets: [ {"dataset": "staff"}, { "dataset": "locations"}, { "dataset": "services"} ]}
          }
        }
        formData.append('queries', JSON.stringify(xhrObj.queries));

      } else if (typeof apiobject == 'object') {
        console.log('process as object rather than string');
        //set all the form data

        //object is added to apicontrol.queue
        //object contains type: event/method; i.e. dom element event or direct method call

        /*
        var apiobject = {};
        apiobject.type = 'method'; //vs event
        apiobject.object = object;
        apicontrol.start(apiobject);

        the question becomes, what is in the object


        //dom element event triggered i.e. button click; pending slot
        //ex: 
        the trigger json should be something like 
        [{"type":"api", "queries":["string array or object array to return aliases etc"], "prepromise":"function name", "postpromise":"function name"
        , "options":[{"method":"post"}, {"url":"if set this is http not xhr"}, {"target":"if http/blank, self etc"}, {"method":"post"}], "forms":["form1", "form2"], "dataobjects":["cart"]}, {another action perhaps}]
        //review data-meta-jsonarray; used some technique to pass array data to the server for perform stuff me thinks
        //manually called
        //
        ex: 
        OLD VERSION 
        var xhrObj = { queries: '[{"query":"public-availabilty-get"}]', start: _startdate, end: _enddate, staff: _thisStaff, services: servicesArr.join(","), locationguid: _locationguid };
        var queryObj = { query: { name: _datasetNameOrg, datasets: [{ dataset: _datasetNameOrg }] } };
        xhrObj.queries.push(queryObj);
        pageObj.CallXHR(xhrObj, XHRFinally); //call method with callback

        NEW VERSION
        use apostrophe so payload just passes string to server which then processes as array
        { queries: '{ "query": "formfield_firstname", "dataset": "firstnames" }, { "query": "public-get", "datasets": [ "staff", "locations", "services"]}],
        auto include quer; just use string array for devs to use
        string array format
        {"options":["option_name":"yet to be determined options"], "prepromise":"function to call before api call; to manipulate dates or something", "postpromise":"function to call on return", "another_parameter":"another value", "queries": ["formfield_firstname", "public-client-profile-list", "public-location-get", "public-services-get", "public-organization-details-get", "public-add-ons-get"]},
        object array to control dataset alias and multiple resultsets
        "queries": [{ "query": "formfield_firstname", "dataset": "firstnames" }, { "query": "public-get", "datasets": [ "staff", "locations", "services"]}],

        so rather than old dom/attribute way and direct call json 
        both ways use json to provide consistency and flexibility

        add ability to create own option that calls custom function and expects return of object array that will pass values to server as name value pairs
        easy peasy

       */

      }

      //######################################################################################################################
      //PROCESS XHR HERE
      //######################################################################################################################
      var xhr = new XMLHttpRequest();
      xhr.open(_method, _url, true);



      xhr.onload = function () {
        if (xhr.status === 200) {
          if (xhr.responseText.length > 0) {
            ///VALUE TO BE SUBMITTED WITH SUBSEQUENT REQUEST SO DUPLICATE PHOTOS ARE NOT CONTINUALLY ADDED TO SERVER
            try {
              var jsonObj = JSON.parse(xhr.responseText);
              //console.log('jsonObj', jsonObj);
              //this is a hardcoded version for hacker news which returns array data
              //xhr.responseText could be a string, array or object
              //MULTIPLE DATASETS MIGHT BE RETURNED 
              //CREATE A META DATA RESPONSE WITH INFORMATION SUCH AS #DATASETS, A MESSAGE, WHAT ELSE?

              if (Array.isArray(jsonObj)) {
                //console.log('THIS IS AN ARRAY RESPONSE HACK @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
                _rex.datasets[_thisDatasetRemote] = {};
                function all() { return this.data }
                _rex.datasets[_thisDatasetRemote].all = all;
                _rex.datasets[_thisDatasetRemote].meta = { "object": "false" };
                _rex.datasets[_thisDatasetRemote].data = jsonObj;

              } else {
                for (let obj of jsonObj.root) {
                  var ds = Object.keys(obj)[0];

                  //name of dataset
                  //console.log('Object.keys(obj)[0]', Object.keys(obj)[0]);
                  //console.log('ARRAY', obj[Object.keys(obj)[0]]);
                  var data = obj[Object.keys(obj)[0]];
                  //console.log('data', data);
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
                  //_rex.datasets[Object.keys(obj)[0]].load = load;
                  //_rex.datasets[Object.keys(obj)[0]].unload = unload;
                  //_rex.datasets[Object.keys(obj)[0]].where = where;
                  //_rex.datasets[Object.keys(obj)[0]].load(dataset);
                  _rex.datasets[_thisDataset].all = all;

                  //_rex.datasets[Object.keys(obj)[0]] = data;
                  _rex.datasets[_thisDataset].meta = { "object": "false" };
                  _rex.datasets[_thisDataset].data = obj[Object.keys(obj)[0]];

                  //console.log('Table obj[Object.keys(obj)[0]][0]', obj[Object.keys(obj)[0]][0]);
                  var _dataset = ds.replace(/-/g, "_");


                }
                _xhrprocessing = false;
                typeof cb === 'function' && cb(cbArguments);

              }
              resolve(); // when successful

            } catch (e) {
              //console.log('e',e);
              var cleanAttempt = '{"root":[' + xhr.responseText.replace(/}{/g, "},{") + ']}';
              var cleanObj = JSON.parse(cleanAttempt)
              try {
                var jsonObj = cleanObj['root'][cleanObj['root'].length - 1];
                for (let obj of jsonObj.root) {
                  addDataset(obj, Object.keys(obj)[0]);
                  //console.log('clean');
                  //console.log('obj', obj);
                  //console.log('Object.keys(obj)[0]', Object.keys(obj)[0]);
                  var _dataset = Object.keys(obj)[0].replace(/-/g, "_");
                  if (obj[Object.keys(obj)[0]].length == 1) {
                    //console.log('save to sessionStorage 3');
                    //sessionStorage.setItem(Object.keys(obj)[0], JSON.stringify(obj[Object.keys(obj)[0]][0]));
                    function all() { return obj[Object.keys(obj)[0]][0] }
                  } else {
                    if (obj[Object.keys(obj)[0]].length > 0) {
                      //console.log('save to sessionStorage 4');
                      //sessionStorage.setItem(Object.keys(obj)[0], JSON.stringify(obj[Object.keys(obj)[0]]));
                      function all() { return obj[Object.keys(obj)[0]] }
                    } else {
                      console.log('not saving to sessionStorage catch');
                    }
                  }
                  //this.tbl = JSON.parse(sessionStorage.getItem(dataset))
                  //function all() { return obj[Object.keys(obj)[0]][0] }
                  //DB[_dataset].load = load;
                  //DB[_dataset].load();
                  //DB[_dataset].all = all;
                }
                _xhrprocessing = false;
                typeof cb === 'function' && cb(cbArguments);
              } catch (e) {
                console.log(e);
              }
              reject();  // when error
            }

            //finally
            //InitialHydrate();
            //InitialRoute();
          }
        } else {
          _xhrprocessing = false;
          typeof cb === 'function' && cb(false);
        }
      };
      /// Send the Data.
      xhr.send(formData);
    });

  }

  function dbXHR() {
    //console.log('dbXHR() #####################################################################################################');
    return new Promise((resolve, reject) => {

      var xhrArgs = arguments[0];
      //var cb = arguments[1];
      //var _len = arguments.length
      //while (arguments.length > _len - 2) {
      //  Array.prototype.shift.apply(arguments);
      //}
      var _url = "http://rock.skedmark.com/xhr";
      var _method = "POST";//DEFAULT IS POST; USE OPTIONS TO CHANGE
      var _thisDatasetRemote;
      if (xhrArgs == 'remote') {

        //######################################################################################################################
        //THIS DOES NOT ALLOW FOR MULTIPLE REMOTE CALLS, A BIT UNIQUE IN THAT SENSE; todo fix
        //######################################################################################################################
        for (let ds of _datasetsinit[xhrArgs]) {
          _thisDatasetRemote = ds.dataset;
          _url = ds.url;
          _method = (typeof ds.method != 'undefined') ? ds.method : _method;
        }
      }
      //console.log('typeof xhrArgs', typeof xhrArgs);
      console.log('xhrArgs', xhrArgs);

      //get external data sources working

      //this is the initializing code which needs to hydrate after server call; but it replicates regular xhr call so pass in cb for hydrate
      //or should hydrate always happen when new data is retrieved

      //var argObj = arguments[0];
      //var cb = arguments[1];
      //var _len = arguments.length

      //while (arguments.length > _len - 2) {
      //  Array.prototype.shift.apply(arguments);
      //}
      //var cbArguments;
      //if (typeof arguments != 'undefined' && arguments.length > 0) {
      //  cbArguments = arguments[0];
      //}


      ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      ///CREATE FORM OBJECT
      ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //add persistent data; only what is explicitly included; passing request params arbitrarily will result in unexpected consequences
      var formData = objToFormData(_rex.datasets.persistent.data[0]);

      //console.log('_rex.datasets', _rex.datasets);

      //add _datasets as queries
      var xhrObj = { queries: [] };
      //var _cleanDatasets = _datasets.system.replace(/-/g, "_");
      console.log('_datasetsinit', _datasetsinit, xhrArgs);
      console.log('_datasetsinit', _datasetsinit[xhrArgs]);

      //could handle dataset aliases here; if typeof ds == 'string' then no alias; 
      //if object then could be array of single procedure/alias ojects { "query": "clients", "dataset": "clients" }
      //if object has "datasets" element then multiple results expected for query; datasets: [{ "dataset": "clients" }, { "dataset": "barbers" }]



      //THIS WORKS FOR INITIAL API DATA REQUESTS AND MANUAL API CALLS USING 3 DIFFERENT FORMATS; STRING, ALIAS, AND MULTIPLE RESULTS FROM SINGLE QUERY
      //ALLOW REMOTE TO SET METHOD (POST/GET) ETC; ADDITIONA PARAMS; LETS CALL THESE OPTIONS
      //EACH REMOTE CALL SHOULD ALLOW FOR CUSTOM OPTIONS
      //NOW HANDLE TRIGGERED ELEMENTS LIKE BUTTON CLICKS
      //THIS WOULD ONLY BE FOR THE QUERIES CALLED; FORMS AND CRUD OBJECTS ARE POPULATED DIFFERENTLY
      for (let ds of _datasetsinit[xhrArgs]) {
        if (typeof ds == 'string') {
          var queryObj = { query: { name: ds, datasets: [{ dataset: ds }] } };
          xhrObj.queries.push(queryObj);

        } else if (typeof ds == 'object' && typeof ds.dataset != 'undefined') {
          //{ "query": "formfield_firstname", "dataset": "firstnames" }, //example
          var queryObj = { query: { name: ds.query, datasets: [{ dataset: ds.dataset }] } };
          xhrObj.queries.push(queryObj);

        } else if (typeof ds == 'object' && typeof ds.datasets != 'undefined') {
          //{ "query": "public-get", "datasets": ["staff", "locations", "services"] }//example
          var _datasets = [];
          for (let datasetname of ds.datasets) {
            var resultset = {};
            resultset.dataset = datasetname;
            _datasets.push(resultset);
          }
          var queryObj = { query: { name: ds, datasets: _datasets } };
          xhrObj.queries.push(queryObj);
          //returns; {query:"public-get", datasets: [ {"dataset": "staff"}, { "dataset": "locations"}, { "dataset": "services"} ]}
        }
      }


      //console.log('xhrObj.queries', xhrObj.queries);
      formData.append('queries', JSON.stringify(xhrObj.queries));
      //add JWT
      //formData.append('JWT', JWT);

      for (let [name, value] of formData) {
        //alert(`${name} = ${value}`); // key1 = value1, then key2 = value2
        //console.log(`${name} = ${value}`);
      }

      //var _url = "http://rock.skedmark.com/xhr";
      _xhrprocessing = true;
      xhr = new XMLHttpRequest();
      xhr.open(_method, _url, true);

      xhr.onload = function () {
        if (xhr.status === 200) {
          if (xhr.responseText.length > 0) {
            ///VALUE TO BE SUBMITTED WITH SUBSEQUENT REQUEST SO DUPLICATE PHOTOS ARE NOT CONTINUALLY ADDED TO SERVER
            try {
              var jsonObj = JSON.parse(xhr.responseText);
              //console.log('jsonObj', jsonObj);
              if (Array.isArray(jsonObj)) {
                //console.log('ARRAY @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
                //check if remote
                _rex.datasets[_thisDatasetRemote] = {};
                function all() { return this.data }
                _rex.datasets[_thisDatasetRemote].all = all;
                _rex.datasets[_thisDatasetRemote].meta = { "object": "false" };
                _rex.datasets[_thisDatasetRemote].data = jsonObj;

              } else {
                for (let obj of jsonObj.root) {
                  var ds = Object.keys(obj)[0];

                  /*
                   create function to create dataset under .data 
                   add functions to manage dataset
                   */

                  //add dataset to _rex object
                  //addDataset(obj, ds);
                  //console.log('load');
                  //console.log('obj', obj);

                  //name of dataset
                  //console.log('Object.keys(obj)[0]', Object.keys(obj)[0]);
                  //console.log('ARRAY', obj[Object.keys(obj)[0]]);
                  var data = obj[Object.keys(obj)[0]];
                  //console.log('data', data);
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
                  //_rex.datasets[Object.keys(obj)[0]].load = load;
                  //_rex.datasets[Object.keys(obj)[0]].unload = unload;
                  //_rex.datasets[Object.keys(obj)[0]].where = where;
                  //_rex.datasets[Object.keys(obj)[0]].load(dataset);
                  _rex.datasets[_thisDataset].all = all;



                  //_rex.datasets[Object.keys(obj)[0]] = data;

                  _rex.datasets[_thisDataset].meta = { "object": "false" };
                  _rex.datasets[_thisDataset].data = obj[Object.keys(obj)[0]];


                  //
                  //console.log('Table obj[Object.keys(obj)[0]][0]', obj[Object.keys(obj)[0]][0]);
                  var _dataset = ds.replace(/-/g, "_");
                  //console.log('DB[dataset]: ' + DB[_dataset]);

                  //if (DB[_dataset] != undefined) {
                  //  //console.log('_dataset: ' + _dataset);
                  //  if (obj[ds].length == 1) {

                  //    //function load(dataset) {
                  //    //console.log('attempting to load ' + dataset);
                  //    //console.log('Cached?', sessionStorage.getItem(dataset));
                  //    //  this.tbl = JSON.parse(sessionStorage.getItem(dataset))
                  //    //}
                  //    ///SET DB[DATASET] TO NEW LOAD FUNCTION

                  //    //console.log('save to sessionStorage');
                  //    //sessionStorage.setItem(ds, JSON.stringify(obj[ds][0]));
                  //    function all() { return obj[ds[0]] }
                  //  } else {
                  //    if (obj[ds].length > 0) {
                  //      //console.log('save to sessionStorage 2');
                  //      sessionStorage.setItem(ds, JSON.stringify(obj[ds]));
                  //      function all() { return obj[ds] }
                  //    } else {
                  //      //console.log('not saving to sessionStorage', obj[Object.keys(obj)[0]]);
                  //    }
                  //  }

                  //  DB[_dataset].load(ds);

                  //}
                  //console.log('obj[Object.keys(obj)[0]].length', obj[Object.keys(obj)[0]].length);

                }
                _xhrprocessing = false;
                typeof cb === 'function' && cb(cbArguments);

              }


              resolve('done'); // when successful

            } catch (e) {
              //console.log('e',e);
              var cleanAttempt = '{"root":[' + xhr.responseText.replace(/}{/g, "},{") + ']}';
              var cleanObj = JSON.parse(cleanAttempt)
              try {
                var jsonObj = cleanObj['root'][cleanObj['root'].length - 1];
                for (let obj of jsonObj.root) {
                  addDataset(obj, Object.keys(obj)[0]);
                  //console.log('clean');
                  //console.log('obj', obj);
                  //console.log('Object.keys(obj)[0]', Object.keys(obj)[0]);
                  var _dataset = Object.keys(obj)[0].replace(/-/g, "_");
                  if (obj[Object.keys(obj)[0]].length == 1) {
                    //console.log('save to sessionStorage 3');
                    //sessionStorage.setItem(Object.keys(obj)[0], JSON.stringify(obj[Object.keys(obj)[0]][0]));
                    function all() { return obj[Object.keys(obj)[0]][0] }
                  } else {
                    if (obj[Object.keys(obj)[0]].length > 0) {
                      //console.log('save to sessionStorage 4');
                      //sessionStorage.setItem(Object.keys(obj)[0], JSON.stringify(obj[Object.keys(obj)[0]]));
                      function all() { return obj[Object.keys(obj)[0]] }
                    } else {
                      console.log('not saving to sessionStorage catch');
                    }
                  }
                  //this.tbl = JSON.parse(sessionStorage.getItem(dataset))
                  //function all() { return obj[Object.keys(obj)[0]][0] }
                  //DB[_dataset].load = load;
                  //DB[_dataset].load();
                  //DB[_dataset].all = all;
                }
                _xhrprocessing = false;
                typeof cb === 'function' && cb(cbArguments);
              } catch (e) {
                console.log(e);
              }
              reject();  // when error
            }

            //todo: make hydrate a promise followed by lazy load
            //add view load any time view changes; add flag to call only once vs multiple times
            //finally
            //InitialHydrate();
            //InitialRoute();
          }
        } else {
          _xhrprocessing = false;
          typeof cb === 'function' && cb(false);
        }
      };
      /// Send the Data.
      xhr.send(formData);
    });
  }


  /*
   TRY SOMETHING LIKE THIS TO CONTINUALLY UPDATE QUEUE AND RUN PROMISE
 
 function countTo(n, sleepTime) {
  return _count(1);

  function _count(current) {`
    if (current > n) {
      return Promise.resolve();
    }

    return new Promise(function(resolve, reject) {
      console.info(current);
      setTimeout(function() {
        resolve(_count(current + 1));
      }, sleepTime);
    });
  }
}


//files is array of xhr calls; manages within function
//pull araay outside function so it can be dynamic
function recursiveDownloadChain(files){
    const nextFile = files.shift();

    if(nextFile){
    //the function download is a promise
        return download(nextFile).then(_ => recursiveDownloadChain(files))
    }else{
      //when all files have been processed finish/complete
        return Promise.resolve();
    }
}

//mockFiles is array of xhr calls

//add xhr object to array
//if array empty then call "run"
//if array not empty then do nothing since already being run
//might need to check that xhr is running or kick off again

//what does xhr need to be self contained
//calling element etc? via trigger or method

recursiveDownloadChain(mockFiles)
.then(_ => console.log('files were downloaded in recursive chain mode'))

   */


  //refactor this to handle queue of xhr calls
  var apicontrol = {
    queue: [], // upload queue
    start: function (apiobject) {
      //apicontrol.start(apiobject);//call this
      // WILL ONLY START IF NO EXISTING UPLOAD QUEUE
      apicontrol.queue.push(apiobject);
      if (apicontrol.queue.length == 1) {
        apicontrol.run();
      }
    },
    run: function () {
      const apiObj = apicontrol.queue.shift();
      if (apiObj) {
        return APICall(apiObj).then(() => apicontrol.run())
      } else {
        return Promise.resolve();
      }
      //return;// here

      //put this is separate function
      var xhr = new XMLHttpRequest(),

      ///SET FORM DATA
      data = new FormData();

      /////////////////////////////////////////////////////////////////////////////////////////////////////
      xhr.open('POST', '/xhr', true);

      xhr.onload = function (e) {
        // SHOW UPLOAD STATUS
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            // SERVER RESPONSE
          } else {
            // ERROR
            console.error('There was an error with api call');
            ///DONT FAIL UNLESS TRIED 3 TIMES
          }
        }
        if (apicontrol.queue.length > 0) {
          apicontrol.run();
        }
      };
      xhr.send(data);
    }
  };

  //lets make this DRY
  function HydrateDatasetList(list) {
    //console.log('HydrateDatasetList() #####################################################################################################');
    return new Promise(function (success, error) {
      if (list === 'persistent_store') {
        elements = document.querySelectorAll('.' + 'dataset-' + classRnd + '-store');
        for (let element of elements) {
          HydrateElement(element)
        }
      } else {
        for (let _ds of _datasetsinit[list]) {
          var elements;
          if (typeof _ds == 'string') {
            _ds = _ds.replace(/-/g, "_");
            elements = document.querySelectorAll('.' + 'dataset-' + classRnd + '-' + _ds);
          } else {
            _ds = _ds.dataset.replace(/-/g, "_");
            elements = document.querySelectorAll('.' + 'dataset-' + classRnd + '-' + _ds);
          }
          for (let element of elements) {
            HydrateElement(element)
          }
        }
}
      success('done'); // when successful
      error();  // when error
    });
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
      /*
       all methods can be called here 
       all xhr calls enter a queue 
       options; can xhr be canceled from queue
        updates should not be canceled so multiple updates occur 
        data lookups can be canceled; sync process etc
          if non-parameterized xhr call being made, can cancel if one already in flight 
            sync to check for calendar updates; no need to make second call if one in-flight
            might need to compare locatio, and date
          if parameterized lookup being called then cancel the one in flight 
            getting slots might change based on services/staff/date
       
       */
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
    Help: function () {
      return getHelp();
    },
    AddDataset: function (dataset, datasetname) {
      addDataset(dataset, datasetname);
    },
    ApiCall: function (object) {
      var apiobject = {};
      apiobject.type = 'method';
      apiobject.object = object;
      apicontrol.start(apiobject);
    },
    InitDB: function () {
        //    let con = xhrQueue.concat(xhrArray);
      //var apiobject = {};
      //apiobject.type = 'init';
      //var datasetArray = ['load', 'remote', 'lazyload'];
      //apiobject.object = datasetArray;
      //apicontrol.start(apiobject);
 
      InitializeObservables()//set all observable classes
        .then(() => dbXHR.apply(null, ['load']))//api call to get load datasets
        .then(() => HydrateDatasetList('persistent_store'))//hydrate load datasets
        .then(() => HydrateDatasetList('load'))//hydrate load datasets
        //.then(() => InitialHydrate())//remove initial class config so initial is separate from hydrate
        .then(() => InitialRoute())//this should be fine
        .then(() => dbXHR.apply(null, ['remote'])) // api call to get remote datasets
        .then(() => HydrateDatasetList('remote'))//hydrate remote datasets
        .then(() => dbXHR.apply(null, ['lazyload']))//api call to get lazyload datasets
        .then(() => HydrateDatasetList('lazyload'))//hydrate lazyload datasets
        .catch(e => {
          console.log('InitDB error', e);
        });
    },
  };
}();

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///INIT OBJECT
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
boltObj.InitDB();
             