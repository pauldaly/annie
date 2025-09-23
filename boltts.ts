enum LogLevel {
  All = 1,
  Debug = 2,
  Info = 3,
  Warn = 4,
  Error = 5,
  Fatal = 6,
}
var _consoleObj = {
  priority: true,
  log: true,
  info: true,
  warning: true,
  debug: true,
  error: true,
  verbose: true,
  separator: true,
  console: true,
  lastmethod: "",
};

interface Log {
  All: string;
  Debug: string;
  Info: string;
  Warn: string;
  Error: string;
  Fatal: string;
}

declare var xhr: XMLHttpRequest;
declare function pageloaded(): void;
declare function pageinit(): void;
declare var _xhrprocessing: boolean;
declare var _requestparams: object;
declare var _request_params_obj: object;
//declare var _persistent: any[];
declare var _datasetsinit: object;
declare var _datasets_init_obj: object;
declare var loglevel: string;

_request_params_obj = (typeof _requestparams != 'undefined')? _requestparams :  _request_params_obj = {};
_datasets_init_obj = (typeof _datasetsinit != 'undefined')?_datasetsinit : _datasets_init_obj = {};

if (typeof loglevel === 'undefined') {
  loglevel = "Fatal";
}

var logEnum: Log = {
  All: null,
  Debug: null,
  Info: null,
  Warn: null,
  Error: null,
  Fatal: null,
};
var Logging: LogLevel = LogLevel[loglevel];

function logging() {
  return logEnum[
    loglevel.charAt(0).toUpperCase() + loglevel.slice(1).toLowerCase()
  ];
}

interface QueryDataset {
  query: string;
  dataset: string;
}
interface QueryDatasets {
  query: string;
  datasets: string[];
}

interface Remote {
  url: string;
  dataset: string;
  method: string;
}

interface ViewDataset {
  load: string[] | QueryDatasets[] ;
  lazyload: string[] | QueryDataset[] | QueryDatasets[];
  remote: Remote[];
}

type ViewDatasets = {
  view: string;
  datasets: ViewDataset[];
};

declare var _viewdatasets: ViewDatasets;

var _host = window.location.hostname;
var _baseurl = `//${_host}/xhr`;

var _jwt = {};
let _thisDatasetRemote: string;
var _thisDatasetLocal = {};
var _thisDataset = {};
var _thisDatasetName = {};
var _thisDatasetType = {};
var _thisDatasetAlias = {};
/*
    init object
    init persistent store
    add request params to store for immediate use in mount 
    add data to persistent store manually to passs data via xhr
    xhr rest call to get all data for this page

    mount all dom elements 
    mount all templates

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
//db help object
//########################################
var _help = {
  all: "get list of all datasets in db as object",
  create: "todo",
  read: "todo",
  update: "todo",
  delete: "todo",
  alterTable: "todo",
  load: "add dataset as array to db",
  unload: "empty db and init with empty store datset",
  where: "todo",
  save: "todo",
};

//########################################
//_rex object; object to manage and store all data; referenced by framework object
//########################################
var _rex = (function () {
  return {
    all: function () {
      return JSON.parse(JSON.stringify(this.datasets));
    },
    datasets: {
      store: { data: [] },
    },
    meta: {
      history: {
        pointer: 0,
        data: [] as Array<{
          datasource: string;
          datafield: any;
          value: any;
          was: any;
        }>,
      },
    },
    create: function (type, name, args) {
      return "todo";
    },
    read: function () {
      return "todo";
    },
    update: function () {
      return "todo";
    },
    delete: function () {
      return "todo";
    },
    alterTable: function () {
      return "todo";
    },
    load: function (dataset) {
      this.datasets = JSON.parse(dataset);
    },
    unload: function () {
      this.datasets = { store: {} };
    },
    where: function () {
      return null;
    },
    save: function () {
      return null;
    },
    help: function () {
      return _help;
    },
  };
})();

//########################################
//_r object; reactive store
//########################################
var rhandler = {
  get(target, key, receiver) {
    if (typeof target[key] === "object" && target[key] !== null) {
      return new Proxy(target[key], rhandler);
    } else {
      return Reflect.get(target, key, receiver); //is this necessary
    }
  },
  set(target, key, value, receiver) {
    return Reflect.set(target.datasets, key, value, receiver.datasets.store);
  },
  apply(target, thisArg, args) {
    return target(...args);
  },
};
const _r = new Proxy(_rex, rhandler);
//########################################

//########################################
//db object
//########################################
var dbhandler = {
  get(target, key, receiver) {
    if (typeof target[key] === "object" && target[key] !== null) {
      return new Proxy(target[key], dbhandler);
    } else {
      return Reflect.get(target, key, receiver);
    }
  },
  set(target, key, value, receiver) {
    Reflect.set(target, key, value, receiver);
    return true;
  },
  apply(target, thisArg, args) {
    return target(...args);
  },
};

var db = new Proxy(_rex, dbhandler);
//add request params to store; store is just name value pairs
function all() {
  return this.data;
}
db.datasets.store.all = all;
db.datasets.store.meta = {
  object: "true",
  count: Object.keys(_request_params_obj).length,
};
db.datasets.store.data = [_request_params_obj];

db.meta.history.all = all;
db.meta.history.pointer = null;
db.meta.history.data = [];

//console.log(_rex.datasets.store.data[0]);
// _rex.datasets.persistent.data =
//   typeof _rex.datasets.store.data[0] !== "undefined"
//     ? _rex.datasets.store.data
//     : [];
// _rex.datasets.persistent.meta.count =
//   typeof _rex.datasets.store.data[0] !== "undefined"
//     ? Object.keys(_rex.datasets.store.data[0]).length
//     : 0;
// for (let item of _persistent) {
//  _rex.datasets.persistent.data[item] = (typeof _rex.datasets.store.data[0][item] !== 'undefined') ? _rex.datasets.store.data[0][item] : '';
// }
// for (let item of _persistent) {
//  _rex.datasets.persistent[item] = _rex.datasets.store[item];
// }

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

  //object could be an array of items to mount of which html is only one
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
  functionThatTakesObserver: any;
  private observers: { [key: string]: Array<(data: any[]) => void> } = {};

  constructor(functionThatTakesObserver) {
    this.functionThatTakesObserver = functionThatTakesObserver;
  }
  //constructor(private subscribeFn: (observer: any) => void) {}
  subscribe(observer) {
    return this.functionThatTakesObserver(observer);
  }
  // subscribe(handlers: { next?: (data: any) => void; error?: (e: any) => void; complete?: () => void }) {
  //   return this.subscribeFn(handlers);
  // }

  map(projectionFunction) {
    return new Observable((observer) => {
      return this.subscribe({
        next(val) {
          observer.next(projectionFunction(val));
        },
        error(e) {
          observer.error(e);
        },
        complete() {
          observer.complete();
        },
      });
    });
  }

  mergeMap(anotherFunctionThatThrowsValues) {
    return new Observable((observer) => {
      return this.subscribe({
        next(val) {
          anotherFunctionThatThrowsValues(val).subscribe({
            next(val) {
              observer.next(val);
            },
            error(e) {
              observer.error(e);
            },
            complete() {
              observer.complete();
            },
          });
        },
        error(e) {
          observer.error(e);
        },
        complete() {
          observer.complete();
        },
      });
    });
  }

  static fromArray(array) {
    return new Observable((observer) => {
      array.forEach((val) => observer.next(val));
      observer.complete();
    });
  }

  static fromEvent(element, event) {
    return new Observable((observer) => {
      const handler = (e) => observer.next(e);
      element.addEventListener(event, handler);
      observer.complete();
      return () => {
        element.removeEventListener(event, handler);
      };
    });
  }

  static fromPromise(promise) {
    return new Observable((observer) => {
      promise
        .then((val: any) => {
          observer.next(val);
          observer.complete();
        })
        .catch((e) => {
          observer.error(e);
          observer.complete();
        });
    });
  }
}

class Observer {
  private observers: { [key: string]: Array<(data: any[]) => void> } = {};

  addObserver(datasource: string, observerFunction: (data: any[]) => void) {
    var _ds = datasource.replace(/-/g, "_");
    //console.log('datasource,_ds', datasource, _ds);

    if (!this.observers[_ds]) {
      this.observers[_ds] = [];
    }
    this.observers[_ds].push(observerFunction);
    //console.log('this.observers', this.observers);
  }

  notifyObservers(datasetName: string) {
    //console.log('notifyObservers datasetName', datasetName);
    const data = _rex.datasets[datasetName].data;//db.datasets[datasetName].data; // Access data from the db
    //console.log('notifyObservers data', data);
    if (this.observers[datasetName]) {
      //console.log('if (this.observers[datasetName]', datasetName);
      this.observers[datasetName].forEach((observerFunction) => {
        observerFunction(data);
      });
    }
  }
}
const dataObserver = new Observer();
//END OBSERVABLE
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

function GUID(x) {
  var x = (typeof x !== 'undefined') ? x : '~';
  var d = new Date().getTime();
  var uuid = 'xxxxxxxx~xxxx~4xxx~yxxx~xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
  });
  return uuid.replace(/~/g, x);
};

function modifyText() {
  console.log("clicked");
}

function APICall(apiobject) {
  var xhrArgs = arguments[0];
//  var cb = apiobject.object[0].callback;
  return new Promise((resolve, reject) => {
    var cb = apiobject.object[0].callback;
    console.log("APICall(apiobject)");
    console.log("apiobject", apiobject);
    console.log("cb", cb);
    //replace all other xhr functions with this
    /*
     if apiobject is a string then it is likely initial setup; could use switch/enum for load, remote, and lazyload


     */
    var formData = objToFormData(_rex.datasets['store'].data[0]);
    var _submit = true;


    var _url = _baseurl;
    var _method = "POST"; //DEFAULT IS POST; USE OPTIONS TO CHANGE

    //crud always needs "queries" object with name of procedures to execute
    var queryObj = { query: { name: "", datasets: [{ dataset: "" }] } };
    var xhrObj = { queries: new Array<typeof queryObj>() };
    console.log("typeof apiobject", typeof apiobject);

    if (typeof apiobject == "string") {
      //get object from dom
      if (apiobject == "remote") {
        //######################################################################################################################
        //THIS DOES NOT ALLOW FOR MULTIPLE REMOTE CALLS, A BIT UNIQUE IN THAT SENSE; todo fix
        //uniquely, remote can make multiple api calls; should this be handled within apicontrol? and passed in as method call
        //load and lazy load are each a single call
        //######################################################################################################################
        for (let ds of _datasets_init_obj[apiobject]) {
          _thisDatasetRemote = <string>ds.dataset;
          _url = ds.url;
          _method = typeof ds.method != "undefined" ? ds.method : _method;
        }
      }

      //loop over all queries to be called
      // queryObj = { query: { name: _datasetNameBookmark, datasets: [{ dataset: _datasetNameBookmark }] } };
      // xhrObj.queries.push(queryObj);
      for (let ds of _datasets_init_obj[apiobject]) {
        if (typeof ds == "string") {
          var queryObj = { query: { name: ds, datasets: [{ dataset: ds }] } };
          xhrObj.queries.push(queryObj);
        } else if (typeof ds == "object" && typeof ds.dataset != "undefined") {
          //{ "query": "formfield_firstname", "dataset": "firstnames" }, //example
          var queryObj = {
            query: {
              name: <string>ds.query,
              datasets: [{ dataset: <string>ds.dataset }],
            },
          };
          xhrObj.queries.push(queryObj);
        } else if (typeof ds == "object" && typeof ds.datasets != "undefined") {
          //{ "query": "public-get", "datasets": ["staff", "locations", "services"] }//example
          var _datasets = [{ dataset: "" }];
          for (let datasetname of ds.datasets) {
            var resultset = { dataset: "" };
            resultset.dataset = datasetname;
            _datasets.push(resultset);
          }
          var queryObj = { query: { name: <string>ds.query, datasets: _datasets } };
          xhrObj.queries.push(queryObj);
          //returns; {query:"public-get", datasets: [ {"dataset": "staff"}, { "dataset": "locations"}, { "dataset": "services"} ]}
        }
      }
      formData.append("queries", JSON.stringify(xhrObj.queries));
    } else if (typeof apiobject == "object") {
      console.log("process as object rather than string");
      //there needs to be query object with name of procedure to execute; or does there
      if (typeof apiobject.object[0].query != "undefined") {
        console.log('typeof apiobject.object[0]["query"] != "undefined"');
        for (let ds of apiobject.object[0].query) {
          if (typeof ds == "string") {
            var queryObj = { query: { name: ds, datasets: [{ dataset: ds }] } };
            xhrObj.queries.push(queryObj);
          } else if (typeof ds == "object" && typeof ds.dataset != "undefined") {
            //{ "name": "formfield_firstname", "dataset": "firstnames" }, //example
            var queryObj = {
              query: {
                name: <string>ds.name,
                datasets: [{ dataset: <string>ds.dataset }],
              },
            };
            xhrObj.queries.push(queryObj);
          } else if (typeof ds == "object" && typeof ds.datasets != "undefined") {
            //{ "name": "public-get", "datasets": ["staff", "locations", "services"] }//example
            //var xhrObj = [{"type":"xhr","method":"post","callback":"cbBookmark","form":["form1","form2"],"query":[{"name": "bookmark-page", "dataset": "some-other-name" }, {"name": "bookmark-page", "datasets": ["staff", "locations", "services"]} ]}]

            var _datasets = [{ dataset: "" }];
            for (let datasetname of ds.datasets) {
              var resultset = { dataset: "" };
              resultset.dataset = datasetname;
              _datasets.push(resultset);
            }
            var queryObj = { 
              query: { 
                name: <string>ds.name,
                datasets: _datasets } };
            xhrObj.queries.push(queryObj);
            //returns; {query:"public-get", datasets: [ {"dataset": "staff"}, { "dataset": "locations"}, { "dataset": "services"} ]}
          }
        }
        console.log('add to form ----------------------------');

        formData.append("queries", JSON.stringify(xhrObj.queries));
      }
      //set all the form data
      //get forms as array 
      //loop over each for and get all input elements
      var _forms = "";
      if (_forms != '') {
        //$.each(_forms, function (n, v) {
          ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
          ///CLONE ENTIRE FORM TO HIDDEN FORM
          ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
          // $('#' + v.form + ' *').filter(':input').each(function () {
          //   formData.append("queries", JSON.stringify(xhrObj.queries));
          // });
          ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
          ///ADD ANY SORTABLE ELEMENTS
          ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
          // $('#' + v.form).find('[data-include-in-form] li').each(function () {
          //   var input = $("<input>").attr({ "type": "hidden", "name": $(this).data('fieldname') }).val($(this).data('id'));
          //   $('#' + _form).append(input);
          // });

          ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
          ///ADD DATATABLE SELECT ELEMENTS IF WITHIN FORM
          ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
          // $('#' + v.form).find('table[data-tableselect="true"]').each(function () {
          //   var fieldname = $(this).attr('data-fieldname');
          //   var dataelement = $(this).attr('data-dataelement');
          //   var _items = [];
          //   var table = $('#' + $(this).attr('id')).DataTable();
          //   for (let i = 0; i < table.rows({ selected: true }).data().length; i++) {
          //     _items.push(table.rows({ selected: true }).data()[i][dataelement]);
          //   }
          //   var _itemsdelimited = _items.join(",");
          //   var input = $("<input>").attr({ "type": "hidden", "name": fieldname }).val(_itemsdelimited);
          //   $('#' + _form).append(input);
          // });

        //});
      }



      //object is added to apicontrol.queue
      //object contains type: event/method; i.e. dom element event or direct method call

    }

    //this works
    //formData.append("queries", "some-value");

    //######################################################################################################################
    //PROCESS XHR HERE
    //######################################################################################################################
    xhr = new XMLHttpRequest();
    xhr.open(_method, _url, true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        console.log('xhr', xhr);
        console.log('xhr.responseText', xhr.responseText);
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
              _rex.datasets[_thisDatasetRemote].all = all;
              _rex.datasets[_thisDatasetRemote].meta = {
                object: "false",
                count: jsonObj.length,
              };
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
                  let item = sessionStorage.getItem(dataset);
                  if (item !== null) {
                    this.tbl = JSON.parse(item);
                  }
                }
                function unload() {
                  this.tbl = [];
                }
                function all() {
                  return this.data;
                }
                function where() {
                  return null;
                }
                function save() {
                  return null;
                }
                //_rex.datasets[Object.keys(obj)[0]].load = load;
                //_rex.datasets[Object.keys(obj)[0]].unload = unload;
                //_rex.datasets[Object.keys(obj)[0]].where = where;
                //_rex.datasets[Object.keys(obj)[0]].load(dataset);
                _rex.datasets[_thisDataset].all = all;

                //_rex.datasets[Object.keys(obj)[0]] = data;
                _rex.datasets[_thisDataset].meta = {
                  object: "false",
                  count: obj[Object.keys(obj)[0]].length,
                };
                _rex.datasets[_thisDataset].data = obj[Object.keys(obj)[0]];

                //console.log('Table obj[Object.keys(obj)[0]][0]', obj[Object.keys(obj)[0]][0]);
                var _dataset = ds.replace(/-/g, "_");
              }
              _xhrprocessing = false;
              if (typeof cb === "string" && typeof window[cb] === "function") {
                (window[cb] as unknown as (...args: any[]) => any)(xhrArgs);
              }        
            }
            resolve("done"); // when successful
          } catch (e) {
            console.log('e',e);
            var cleanAttempt =
              '{"root":[' + xhr.responseText.replace(/}{/g, "},{") + "]}";
            var cleanObj = JSON.parse(cleanAttempt);
            try {
              var jsonObj = cleanObj["root"][cleanObj["root"].length - 1];
              for (let obj of jsonObj.root) {
                //addDataset(obj, Object.keys(obj)[0]);
                //console.log('clean');
                //console.log('obj', obj);
                //console.log('Object.keys(obj)[0]', Object.keys(obj)[0]);
                var _dataset = Object.keys(obj)[0].replace(/-/g, "_");
                if (obj[Object.keys(obj)[0]].length == 1) {
                  //console.log('save to sessionStorage 3');
                  //sessionStorage.setItem(Object.keys(obj)[0], JSON.stringify(obj[Object.keys(obj)[0]][0]));
                  //function all() { return obj[Object.keys(obj)[0]][0] }
                } else {
                  if (obj[Object.keys(obj)[0]].length > 0) {
                    //console.log('save to sessionStorage 4');
                    //sessionStorage.setItem(Object.keys(obj)[0], JSON.stringify(obj[Object.keys(obj)[0]]));
                    //function all() { return obj[Object.keys(obj)[0]] }
                  } else {
                    console.log("not saving to sessionStorage catch");
                  }
                }
                //this.tbl = JSON.parse(sessionStorage.getItem(dataset))
                //function all() { return obj[Object.keys(obj)[0]][0] }
                //DB[_dataset].load = load;
                //DB[_dataset].load();
                //DB[_dataset].all = all;
              }
              _xhrprocessing = false;
              if (typeof cb === "string" && typeof window[cb] === "function") {
                (window[cb] as unknown as (...args: any[]) => any)(xhrArgs);
              }        
            } catch (e) {
              console.log(e);
            }
            reject(); // when error
          }

          //finally
          //InitialMount();
          //InitialRoute();
        } else {
          _xhrprocessing = false;
          console.log('typeof cb === "string"', typeof cb === "string"); 
          console.log(cb in window); // true
          console.log('cb function boolean', typeof cb === "string" && typeof window[cb] === "function"); 
          //console.log('typeof cb === "function"', typeof window[cb] === "function");
          typeof cb === "string" && typeof window[cb] === "function" && window[cb]();
          // if (typeof cb === "string" && typeof window[cb] === "function") {
          //   (window[cb] as unknown as (...args: any[]) => any)();
          // }
        }
      } else {
        _xhrprocessing = false;
        console.log('cb function', typeof cb === "string" && typeof window[cb] === "function"); 
        typeof cb === "string" && typeof window[cb] === "function" && window[cb]();
      }
    };
    /// Send the Data.
    xhr.send(formData);
  });
}

//THIS SETS ROUTE OBSERVABLES
var routecontainers: NodeListOf<Element> = document.querySelectorAll("[data-routecontainer]");
//console.log('routecontainers defined', typeof routecontainers, typeof routecontainers != "undefined");

if (typeof routecontainers != "undefined" && routecontainers.length > 0) {
  for (let routecontainer of routecontainers as any) {
    //GET CLASS CLASS STATES
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //does this need to be inside the subscriber too
    //let routecontainerjson = routecontainer.getAttribute('data-routecontainer');
    //var routecontainerobj = JSON.parse(routecontainerjson);
    //var statefunction = routecontainerobj.classstatefunction;
    //var states = routecontainerobj.classstates;
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    var routes = routecontainer.querySelectorAll("[data-route]"); // All with attribute named "property"
    for (let route of routes) {
      //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //this all needs to be in the subscribe
      //var routeobj = route.getAttribute('data-route');
      //var target = routeobj.target;
      //configure event handler as click to target
      //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

      //can initial class state be set here outside of the nav event click function

      let routeClick = Observable.fromEvent(route, "click");
      routeClick.subscribe({
        next() {
          let routecontainerjson = routecontainer.getAttribute(
            "data-routecontainer"
          );
          var routecontainerobj = JSON.parse(routecontainerjson!);
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
          if (!route.hasAttribute("disabled")) {
            var routeobj = { target: "", fullcalendar: null };
            let dataRoute = route.getAttribute("data-route");
            if (dataRoute !== null) {
              routeobj = JSON.parse(dataRoute);
            }

            var targetobj = routeobj.target;
            var fullcalendarobj = routeobj.fullcalendar;

            console.log("routeobj", routeobj);
            var target;
            if (Array.isArray(targetobj)) {
              for (let targetroute of targetobj) {
                //console.log('targetroute', targetroute);
                var _ds = targetroute.condition.datasource.replace(/-/g, "_");
                var _df = targetroute.condition.datafield;
                //console.log('_ds', _ds);
                //console.log('_df', _df);
                if (typeof db.datasets[_ds].data[0][_df] != "undefined") {
                  const value = db.datasets[_ds].data[0][_df];
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
            var views: NodeListOf<Element> = document.querySelectorAll("view");
            for (let view of views as any) {
              if (view instanceof HTMLTemplateElement) {
                view.style.display = "none";
              }
            }
            var targetelement = document.getElementById(target);
            targetelement!.style.display = "block";
            //END DISPLAY SELECTED VIEW; HIDE ALL OTHER VIEWS
            if (typeof fullcalendarobj != "undefined") {
              ($("#fullcalendar") as any).fullCalendar("render");
            }

            //if there is no class logic state function then just navigate to view selected

            var activeelement = document.querySelector("." + states.active);

            if (activeelement != null) {
              activeelement.classList.remove(states.active);
              activeelement.classList.add(states.enabled);
            }

            route.classList.remove(states.enabled);
            route.classList.add(states.active);

          }
        },
        error(e) {
          console.log(e);
        },
        complete() {
          //console.log('complete trigger click');
        },
      });

      //  for (let item of routeobj.classes) {
      //how do we handle switching classes
      //  }
    }
  }
  } else {
  //process as individual nav routes located anywhere on the page layout rather than as a group
  var routes: NodeListOf<Element> | any =
    document.querySelectorAll("[data-route]");
  for (let route of routes) {
    let routeClick = Observable.fromEvent(route, "click");
    routeClick.subscribe({
      next() {
        if (!route.hasAttribute("disabled")) {
          var routeobj = JSON.parse(route.getAttribute("data-route"));
          var targetobj = routeobj.target;
          var fullcalendarobj = routeobj.fullcalendar;

          console.log("routeobj", routeobj);
          var target;
          if (Array.isArray(targetobj)) {
            for (let targetroute of targetobj) {
              var _ds = targetroute.condition.datasource.replace(/-/g, "_");
              var _df = targetroute.condition.datafield;
              if (typeof db.datasets[_ds].data[0][_df] != "undefined") {
                if (
                  targetroute.condition.value == db.datasets[_ds].data[0][_df]
                ) {
                  target = targetroute.name;
                  break;
                }
              }
            }
          } else {
            target = targetobj;
          }

          //DISPLAY SELECTED VIEW; HIDE ALL OTHER VIEWS
          var views = document.querySelectorAll("view");
          for (let view of Array.from(views)) {
            view.style.display = "none";
          }
          var targetelement = document.getElementById(target);
          targetelement.style.display = "block";
          //END DISPLAY SELECTED VIEW; HIDE ALL OTHER VIEWS
          // if (typeof fullcalendarobj != 'undefined') {
          //   $('#fullcalendar').fullCalendar('render');
          // }

          //if there is no class logic state function then just navigate to view selected
        }
      },
      error(e) {
        console.log(e);
      },
      complete() {
        //console.log('complete trigger click');
      },
    });
  } //end manual route
}

//refactor this to handle queue of xhr calls
let apicontrol = {
  queue: new Array<string>(), // upload queue

  start: function (apiobject) {
    //apicontrol.start(apiobject);//call this
    /*
    check if xhr needs to be canceled; like new sync called
    check if request is in queue
    */


    // WILL ONLY START IF NO EXISTING UPLOAD QUEUE   
    apicontrol.queue.push(apiobject);
    if (apicontrol.queue.length == 1) {
      apicontrol.run();
    }
  },
  run: function () {
    const apiObj = apicontrol.queue.shift();
    if (apiObj) {
      return APICall(apiObj).then(() => apicontrol.run());
    } else {
      return Promise.resolve();
    }
  },
};

var triggers = document.querySelectorAll("[data-trigger]"); // All with attribute named "property"
for (let trigger of triggers as any) {
  InitializeTrigger(trigger);
} //end for triggers

function InitializeTrigger(trigger) {
  var autoreset = false;
  let triggerjson = trigger.getAttribute("data-trigger");

  let triggerobj = trigger.getAttribute("data-trigger");
  //console.log('types', types)

  //INITIALIZE DATASET AND DATA FIELD
  var _ds = "store";

  //console.log('triggerjson', triggerjson);
  var obj = JSON.parse(triggerjson);
  //console.log('obj', obj);
  //console.log('triggersobj', triggerarr);

  var autoreset = false;

  if (typeof obj.datasource !== "undefined") {
    _ds = obj.datasource;
  }

  //triggers is an array of one or more triggers inside data-trigger = 
  //each trigger can have a different type of action
  //todo refactor to handle array of triggers or single trigger
  //this initiates all event listeners; assigns events to specific elements
  //for (let triggerevt of item) {
  obj.triggers = obj.triggers || [obj];
  for (let item of obj.triggers) {
    switch (item.type) {
      case "download":
        break;
        case "list-selector":
            var _to_id = item.element_to_id;
            var target = document.querySelector('#' + _to_id); 

            trigger.addEventListener("click", function(e){

              //MOVE LI TO OTHER LIST
              if(e.target && e.target.nodeName.toLowerCase() == "li") {
                // List item found!  Output the ID!
                target.append(e.target);
              }
            
                var lifrom = trigger.querySelectorAll('li'); // NodeList
                var lifromArray = Array.from(lifrom); // Convert NodeList to Array

                lifromArray.sort(function (a, b) {
                  var at = $(a).text().toLowerCase();
                  var bt = $(b).text().toLowerCase();
                  return (at > bt) ? 1 : ((at < bt) ? -1 : 0);            // Tell the sort function how to order
                });

                trigger.innerHTML = '';
                lifromArray.forEach(function(node) { trigger.append(node); });
      
                var lito = target.querySelectorAll('li'); // NodeList
                var litoArray = Array.from(lito); // Convert NodeList to Array

                litoArray.sort(function (a, b) {
                  var at = $(a).text().toLowerCase();
                  var bt = $(b).text().toLowerCase();
                  return (at > bt) ? 1 : ((at < bt) ? -1 : 0);            // Tell the sort function how to order
                });
                target.innerHTML = '';
                litoArray.forEach(function(node) { target.append(node); });

            });

        break;
        case "api":
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
        api caller needs to handle each type 
        dom element has data-trigger json and possibly attributes 
        manual call has json too, it could be the same format to make it easier with type = manual
        can handle more than just queries and can include query alias

        data-trigger_='[{"type":"api","method":"post","action": "/some-url-or","callback":"cbOrSomeFunctionName","form":["form1","form2"],"query":["update-table-query","another_query_to_call"]}]'>
        data-trigger_='[{"type":"api","method":"post","action": "/some-url-or","form":["form1","form2"],"query":["update-table-query","another_query_to_call"]}]'>
        data-trigger_='[{"type":"api","method":"post","callback":"cbOrSomeFunctionName","form":["form1","form2"],"query":["update-table-query","another_query_to_call"]}]'>
        data-trigger_='[{"type":"api","method":"post","callbefore": {"function":"cbparams","params":["-","30","-","1"]},"form":["form1"]}]'>

         */
        //REFACTOR TO USE MUTATIONOBSERVER INSTEAD OF THE CUSTOM OBSERVABLE
        let triggerApi = Observable.fromEvent(trigger, "click");
        triggerApi.subscribe({
          next() {
            var apiobject = { type: "", object: null };
            apiobject.type = "event";
            apiobject.object = this;
            //get methods
            var cb = window[item.callbefore.function] as unknown as (
              ...args: any[]
            ) => any;
            var cbparams = item.callbefore.params;

            if (typeof cb === "function") {
              Promise.resolve(cb(...cbparams)).then(
                function (response) {
                  apicontrol.start(apiobject);
                },
                function (error) {
                  console.error("api trigger Failed!", error);
                }
              );
            } else {
              apicontrol.start(apiobject);
            }

          },
          error(e) {
            console.log(e);
          },
          complete() {
            //console.log('complete event---')
          },
        });

        break;
      case "fullcalendar":
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
        let triggerFC = Observable.fromEvent(trigger, "click");
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
              Object.keys(data).forEach((key) => {
                //console.log(key, data[key]);
                calendardata[key] = data[key];
                //buildFormData(formData, data[key], parentKey ? `${parentKey}[${key}]` : key);
              });
            }

            for (let _thisDataset of _thisDataObjects) {
              //console.log('_thisDataset', _thisDataset);
              //console.log('_rex.datasets[_thisDataset]', _rex.datasets[_thisDataset].data);
              if (typeof _rex.datasets[_thisDataset] != "undefined") {
                //for (let data of _rex.datasets[_thisDataset].data) {
                var data = _rex.datasets[_thisDataset].data;
                console.log("data", data);
                Object.keys(data).forEach((key) => {
                  //console.log(key, data[key]);
                  //console.log('Array?', Array.isArray(data[key]));
                  if (Array.isArray(data[key])) {
                    var elements_array = data[key].join(",");
                    calendardata[key] = elements_array;
                  } else {
                    calendardata[key] = data[key]; //this would pass value as array if not "joined"
                  }

                  //buildFormData(formData, data[key], parentKey ? `${parentKey}[${key}]` : key);
                });
                //}
              }
            }

            console.log("calendardata", calendardata);
            //need jquery and fullcalendar referenced
            //$('#' + _thisId).fullCalendar('refetchEvents');
            //PopulateCalendar();
            /*
             to submit xhr; need parameter name [serviceguids]
             to calculate template values; need datasource, fieldname/key value, 
             to save to object [cart]; is this array or singular value; list of service guids vs. booking date or singular staff guid
             */
          },
          error(e) {
            console.log(e);
          },
          complete() {
            //console.log('complete trigger click');
          },
        });

        break;
      case "http":
        break;
      case "route":
        break;
      case "change":
        //_df can not be null or what is this field for other than to manipulate data locally
        //might need to use blur; change may not trigger unless enter is clicked; input is another option but might not work in all browsers
        /*
         blur only helps with text and text area; changes handles blur and changes for radio, checkbox, select, date, and file
         blur, keyup and change (are there others) will update watching elements and populate datasets 
         keyup mounts watchers directly without updating dataset 
         blur/change updates dataset and sets history of object to allow for undo
         
         */

        //CHANGE SHOULD ONLY TRIGGER WHEN THE DATA HAS CHANGED

        //console.log('PRE-INIT: WAS: ', _ds, _df, trigger.name);
        let triggerChange = Observable.fromEvent(trigger, "change");
        triggerChange.subscribe({
          next() {
            //truncate history array from currect history pointer
            //if (typeof(_rex.meta.pointer) ==='number') {
            //if (!isNAN(_rex.meta.pointer)) {
            var slice = 0;
            if (
              Number.isInteger(_rex.meta.history.pointer) &&
              _rex.meta.history.pointer + 1 < _rex.meta.history.data.length
            ) {
              slice =
                _rex.meta.history.data.length - (_rex.meta.history.pointer + 1);
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
              was: was,
            };
            _rex.meta.history.pointer = ptr;
            _rex.meta.history.data.push(historyitem);
            _rex.datasets[_ds].data[0][trigger.name] = trigger.value;
            //include.js options are only: upper, lower, encrypt, clone, and sanitize numbers/characters/regex

            //CALL OBSERVER TO UPDATE OBSERVERS
            //NO NEED TO CALL MOUNT ELEMENT; OBSERVER WILL HANDLE THIS
            //TODO ADD OBSERVER CALL HERE

            },
          error(e) {
            console.log(e);
          },
          complete() {
            //console.log('complete event---')
          },
        });

        break;
      case "undo":
        //need to handle first element
        //move back in history if exists
        //this is a click trigger
        let triggerUndo = Observable.fromEvent(trigger, "click");
        triggerUndo.subscribe({
          next() {
            var _df;
            //change pointer -1
            //update data to 'was' value
            var ptr = Number.isInteger(_rex.meta.history.pointer)
              ? _rex.meta.history.pointer > 0
                ? _rex.meta.history.pointer
                : 0
              : null;

            if (ptr != null && Number.isInteger(ptr)) {
              _ds = _rex.meta.history.data[ptr]["datasource"];
              _df = _rex.meta.history.data[ptr]["datafield"];
              var value = _rex.meta.history.data[ptr]["was"];
              //_rex.meta.history.pointer = (ptr == 0) ? 0 : ptr - 1;
              _rex.meta.history.pointer = ptr - 1;

              _rex.datasets[_ds].data[0][_df] = value;
              //include.js options are only: upper, lower, encrypt, clone, and sanitize numbers/characters/regex
              //NO NEED TO CALL MOUNT ELEMENT; OBSERVER WILL HANDLE THIS
              //TODO ADD OBSERVER CALL HERE

            }
          },
          error(e) {
            console.log(e);
          },
          complete() {
            //console.log('complete event---')
          },
        });

        break;
      case "redo":
        //move forward in history if exists
        let triggerRedo = Observable.fromEvent(trigger, "click");
        triggerRedo.subscribe({
          next() {
            var _df;
            var ptr = Number.isInteger(_rex.meta.history.pointer)
              ? _rex.meta.history.pointer < _rex.meta.history.data.length - 2
                ? _rex.meta.history.pointer + 1
                : _rex.meta.history.data.length - 1
              : null;

            if (ptr != null && Number.isInteger(ptr)) {
              _ds = _rex.meta.history.data[ptr]["datasource"];
              _df = _rex.meta.history.data[ptr]["datafield"];
              var value = _rex.meta.history.data[ptr]["value"];
              _rex.meta.history.pointer =
                ptr == _rex.meta.history.data.length
                  ? _rex.meta.history.data.length - 1
                  : ptr;

              _rex.datasets[_ds].data[0][_df] = value;
              //NO NEED TO CALL MOUNT ELEMENT; OBSERVER WILL HANDLE THIS
              //TODO ADD OBSERVER CALL HERE
            }
          },
          error(e) {
            console.log(e);
          },
          complete() {
            //console.log('complete event---')
          },
        });
        break;
      case "keyup":
        //only add event listener if keyup is set
        let triggerKeyup = Observable.fromEvent(trigger, "keyup");
        triggerKeyup.subscribe({
          next() {
            //get all elements watching this trigger; should watch dataset/field
            //NO NEED TO CALL MOUNT ELEMENT; OBSERVER WILL HANDLE THIS
            //TODO ADD OBSERVER CALL HERE

            //NEED TO RETHINK HOW KEY UP WORKS, WHAT IS WATCHED IF DATA IS NOT STORED ANYWHERE

            var elements = document.querySelectorAll(
              "." +
                "dataset-" +
                classRnd +
                "-" +
                _ds +
                "." +
                "datafield-" +
                classRnd +
                "-" +
                trigger.name
            ); // All with attribute named "property"
            //populate dataset/store with value;
            //_r[trigger.name] = trigger.value;//should this be .data
            //populate watching elements with trigger value
            //NEED TO MOUNT BASED ON THIS ELEMENT RATHER THAN WHAT IS IN DATASET BECAUSE THIS IS A TEMPORARY VALUE UNTIL CHANGE/BLUR IS TRIGGERED
            //SO JUST UPDATE FIELD DIRECTLY

            //todo; works
            for (let element of elements as any) {
              if (typeof item.autoreset !== "undefined") {
                autoreset = item.autoreset;
              }

              var observedvalue = "";
              if (autoreset == true && trigger.value == "") {
                //get original value before keypress started; let this be configurable
                //auto-reset:'true/false'
                observedvalue = db.datasets[_ds].data[0][trigger.name];
              } else {
                observedvalue = trigger.value;
              }

              if (
                element instanceof HTMLInputElement ||
                element instanceof HTMLTextAreaElement
              ) {
                element.value = observedvalue;
              } else {
                element.innerHTML = observedvalue;
              }
            }
          },
          error(e) {
            console.log(e);
          },
          complete() {
            //console.log('complete event---');
          },
        });
        break;
      case "click":
        //add xhr or redirect or reload page calls to send data to server
        /*
          EXAMPLES
          data-trigger_='[{"type":"click","method":"post","action": "/some-url-or","callback":"cbOrSomeFunctionName","form":["form1","form2"],"query":["update-table-query","another_query_to_call"]}]'>
          data-trigger_='[{"type":"click","method":"post","action": "/some-url-or","form":["form1","form2"],"query":["update-table-query","another_query_to_call"]}]'>
          data-trigger_='[{"type":"click","method":"post","callback":"cbOrSomeFunctionName","form":["form1","form2"],"query":["update-table-query","another_query_to_call"]}]'>
          data-trigger_='[{"type":"click","method":"post","callbefore": {"function":"cbparams","params":["-","30","-","1"]},"form":["form1"]}]'>

        */


        //add history function somewhere around here
        let triggerClick = Observable.fromEvent(trigger, "click");
        triggerClick.subscribe({
          next() {
            //get methods
            var cb = window[item.callbefore.function] as unknown as (
              ...args: any[]
            ) => any;
            var cbparams = item.callbefore.params;

            if (typeof cb === "function") {
              Promise.resolve(cb(...cbparams)).then(
                function (response) {
                  //assuming xhr call callxhr(triggerobj);
                  console.log("cb Success! " + response);
                },
                function (error) {
                  console.error("Failed!");
                }
              );
            } else {
              console.error(
                "Error: " +
                  item.callbefore.function +
                  " is not a function on the window object."
              );
            }
          },
          error(e) {
            console.log(e);
          },
          complete() {
            //console.log('complete trigger click');
          },
        });
        break;
      case "crud":
        //console.log('wiring up crud');
        //the value crud is used as the trigger type
        //when a crud element is clicked it triggers a data change somewhere
        //could be: create, update, delete; can't see a reason to trigger on read so technically cud

        //nav container needs classes added for each datasource watched; just like other observers
        //process nav containers watching any datasources changed

        //add history function somewhere around here
        let triggerCRUD = Observable.fromEvent(trigger, "click");
        triggerCRUD.subscribe({
          next() {
            var _thisDataset = item.targetobject;
            var _thisDataType = item.datatype;
            var _thisParameterLabel = item.paramname;
            if (typeof _rex.datasets[_thisDataset] == "undefined") {
              _rex.datasets[_thisDataset] = {};

              function all() {
                return this.data;
              }
              _rex.datasets[_thisDataset].all = all;
              _rex.datasets[_thisDataset].meta = { object: "false" };
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
            let key = trigger.getAttribute("data-key");
            switch (_thisDataType) {
              case "toggle":
                //if exists, remove
                var iconelement = trigger.querySelector("#" + item.targeticon);
                var classFrom = iconelement.classList.contains(item.classshow)
                  ? item.classshow
                  : item.classhide;
                var classTo =
                  classFrom == item.classshow ? item.classhide : item.classshow;
                iconelement.classList.replace(classFrom, classTo);

                var classFrom = trigger.classList.contains(item.classactive)
                  ? item.classactive
                  : item.classinert;
                var classTo =
                  classFrom == item.classactive
                    ? item.classinert
                    : item.classactive;
                trigger.classList.replace(classFrom, classTo);

                //console.log('_rex.datasets[_thisDataset].data', _rex.datasets[_thisDataset].data);
                //console.log('_rex.datasets[_thisDataset].data', _rex.datasets[_thisDataset].data[0]);
                //console.log('key', key);
                //console.log('filtered', _rex.datasets[_thisDataset].data.length);
                if (
                  typeof _rex.datasets[_thisDataset].data[
                    _thisParameterLabel
                  ] != "undefined" &&
                  _rex.datasets[_thisDataset].data[_thisParameterLabel].length >
                    0
                ) {
                  //console.log('_rex.datasets[_thisDataset].data[0][_thisParameterLabel]', _rex.datasets[_thisDataset].data[0][_thisParameterLabel]);
                  var filtered = grep(
                    _rex.datasets[_thisDataset].data[_thisParameterLabel],
                    key,
                    "unique"
                  );
                  //console.log('filtered', filtered);
                  _rex.datasets[_thisDataset].data[_thisParameterLabel] =
                    filtered; //.push(key);
                } else {
                  //var row = {};
                  //row[_thisParameterLabel] = [];
                  //row[_thisParameterLabel].push(key);
                  //console.log('row', row);
                  _rex.datasets[_thisDataset].data[_thisParameterLabel] = [];
                  _rex.datasets[_thisDataset].data[_thisParameterLabel].push(
                    key
                  ); //.push(key);
                  //console.log('object', _rex.datasets[_thisDataset].data);
                  //console.log('stringify', JSON.stringify(_rex.datasets[_thisDataset].data));
                }
                break;
              case "insert":
                //always insert, like multiple products
                _rex.datasets[_thisDataset].data[_thisParameterLabel].push(key);
                //NO NEED TO CALL MOUNT ELEMENT; OBSERVER WILL HANDLE THIS
                //TODO ADD OBSERVER CALL HERE
            break;
              case "remove":
                var filtered = grep(
                  _rex.datasets[_thisDataset].data[_thisParameterLabel],
                  key,
                  "remove"
                );
                _rex.datasets[_thisDataset].data[_thisParameterLabel].push(key);
                //NO NEED TO CALL MOUNT ELEMENT; OBSERVER WILL HANDLE THIS
                //TODO ADD OBSERVER CALL HERE
            break;
              case "single":
                //clear array and add this
                var iconelement = trigger.querySelector("." + item.targeticon);
                console.log("item", item);

                var classFrom = iconelement.classList.contains(item.classshow)
                  ? item.classshow
                  : item.classhide;
                var classTo =
                  classFrom == item.classshow ? item.classhide : item.classshow;
                //hide checkmark for all elements
                var elements = document.querySelectorAll("." + item.targeticon);
                for (let element of elements as any) {
                  element.classList.replace(item.classshow, item.classhide);
                }
                iconelement.classList.replace(classFrom, classTo);

                //var classFrom = (trigger.classList.contains(item.classactive)) ? item.classactive : item.classinert;
                //var classTo = (classFrom == item.classactive) ? item.classinert : item.classactive;
                //trigger.classList.replace(classFrom, classTo);

                _rex.datasets[_thisDataset].data[_thisParameterLabel] = [];
                _rex.datasets[_thisDataset].data[_thisParameterLabel].push(key);
                console.log(
                  "_rex.datasets[_thisDataset].data",
                  _rex.datasets[_thisDataset].data
                );
                //NO NEED TO CALL MOUNT ELEMENT; OBSERVER WILL HANDLE THIS
                //TODO ADD OBSERVER CALL HERE
              break;
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

            //NO NEED TO CALL MOUNT ELEMENT; OBSERVER WILL HANDLE THIS
            //TODO ADD OBSERVER CALL ABOVE


            // var elements = document.querySelectorAll(
            //   "." + "dataset-" + classRnd + "-" + _thisDataset
            // ); //trigger.name All with attribute named "property"
            // for (let element of elements as any) {
            //   //console.log('element', element);
            //   MountElement(element);
            // }

            /*

            MOUNT CART COMPONENT THINKS
             add to MountElement
             update mount to handle complex object like a component/reset component since change was made and
             update individual items; datetime
             update arrays; products
             either update entire component (which would be like updating a single inner html h2 tag)
             or find a way to surgically update only the data that has changed either by dataset or knowing if a specific datum has changed
             //handle sorting by: alpha, price, chron, etc.
             */

            //GENERIC THOUGHTS
            //get methods
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
          error(e) {
            console.log(e);
          },
          complete() {
            //console.log('complete trigger click');
          },
        });
        break;
    } //end for type
  }
  //}

}

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

var grep = function (items, value, method) {
  //console.log('items, value, method', items, value, method)

  var filtered = new Array<string>();
  //len = items.length,
  switch (method) {
    case "exists":
      for (let item of items) {
        if (item == value) {
          return true;
        }
      }
      return false;
      break;
    case "remove":
      for (let item of items) {
        if (item != value) {
          filtered.push(item);
        }
      }
      return filtered;
      break;
    case "unique":
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
};

function pad(str, max) {
  str = str.toString();
  return str.length < max ? pad("0" + str, max) : str;
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
//mount is called from triggers if element is "observing" trigger; if observer is watching dataset-...-datasetlabel
function MountElement(element) {
  const observeData = JSON.parse(element.getAttribute('data-observe')); // Parse the JSON string
  const { datasource } = observeData;

  if (datasource) {
    if (Array.isArray(datasource)) {
      for (let ds of datasource) {
        AddObserver(ds, element);
      }
    }else{
      AddObserver(datasource, element);
    }
      
  }
}

function AddObserver(datasource, element){
  const observeData = JSON.parse(element.getAttribute('data-observe')); // Parse the JSON string
  var _ds = "store";
  var value = "";
  var _df = "";
 _ds = datasource.replace(/-/g, "_");


  dataObserver.addObserver(datasource, (data) => {
    const observeDataObj = JSON.parse(element.getAttribute('data-observe')); // Parse the JSON string
    // console.log('let of must be array, does not work when iterating over object, probably why i had all data-observe as arrays');
    var observeData = [];
    observeData.push(observeDataObj);
    for (let item of observeData) {
        interface ThisObjType {
          state?: {
            function?: string;
            condition?: any[];
            classenabled?: string;
            classdisabled?: string;
          };
        }
        //console.log('servicecontainer ===============================================================================================', element.id);

        // if (element.id == 'servicecontainer') {
        //   console.log('serviccontainer ===============================================================================================', element.id);
        //   element.innerHTML = '#######################################';
        //   return;
        // }

        switch (item.type) {
          case "nav":
          var navelements = element.querySelectorAll("[data-route]"); //trigger.name All with attribute named "property"
          for (let navelement of navelements) {
            let thisroute = navelement.getAttribute("data-route");
            //console.log('thisroute', thisroute);
            var thisobj: ThisObjType = {}; //{state:{function:null,condition:new Array<datasource, datafield, operator, count>, classenabled:'', classdisabled:''}};//what if template JSON HAS MORE THAN ONE object
            try {
              thisobj = JSON.parse(thisroute); //what if template JSON HAS MORE THAN ONE object
            } catch (e) {
              console.log("Invalid JSON");
            }
            //console.log('thisobj', thisobj);
  
            if (
              typeof thisobj.state != "undefined" &&
              typeof thisobj.state.function != "undefined"
            ) {
              var p = window[thisobj.state.function];
              p().then(
                function (response) {
                  //assuming xhr call callxhr(triggerobj);
                  //console.log(response);
                },
                function (error) {
                  console.error("Failed!", error);
                }
              );
            }
  
            if (
              typeof thisobj["state"] != "undefined" &&
              typeof thisobj["state"].condition != "undefined"
            ) {
              //use NodeIterator.previousNode() to find container and the classes for enabled and disabled
              var _classenabled = thisobj["state"].classenabled;
              var _classdisabled = thisobj["state"].classdisabled;
              for (let condition of thisobj["state"].condition) {
                var _dsLocal = condition.datasource;
                var _dfLocal = condition.datafield;
                //console.log('db.datasets[_ds].data', _rex.datasets[_ds].data);
                //console.log('db.datasets[_ds].data[0]', _rex.datasets[_ds].data[0]);
                //console.log('typeof db.datasets[_ds].data[0][_df]', typeof db.datasets[_ds].data[0][_df], typeof db.datasets[_ds].data[0][_df]);
                if (
                  typeof db.datasets[_dsLocal].data[_dfLocal] != "undefined" &&
                  typeof db.datasets[_dsLocal].data[_dfLocal] == "object"
                ) {
                  //console.log('condition.operator', condition.operator);
                  switch (condition.operator) {
                    case "=":
                      //when true && if doing a numerical comparison; call numerical state function
                      if (
                        db.datasets[_dsLocal].data[_df].length ==
                        Number(condition.count)
                      ) {
                        //console.log('going in =');
                        SetNavState(navelement, thisobj, condition);
                      }
                      break;
                    case ">":
                      //console.log('going in >');
                      //when true && if doing a numerical comparison; call numerical state function
                      if (
                        db.datasets[_dsLocal].data[_df].length >
                        Number(condition.count)
                      ) {
                        //console.log('SetNavState(navelement)', navelement);
                        //console.log('thisobj)', thisobj );
                        //console.log('condition)', condition);
                        SetNavState(navelement, thisobj, condition);
                      }
                      break;
                    default:
                  }
                } else {
                  navelement.setAttribute("disabled", "");
                  navelement.classList.remove(_classenabled);
                  navelement.classList.add(_classdisabled);
                }
              }
            }
          }
          break;
          case "select":
            //value = db.datasets[_ds].data[0][item.value]; item.value is the field in the dataset
            var _selected = null;
            for (let row of db.datasets[_ds].data) {
              if (row.selected && row.selected == 'true') {
                _selected = row.optionvalue;
              }

              var opt = document.createElement('option');
              opt.value = row.optionvalue;
              opt.innerHTML = decodeTrustedEntities(row.optionname);
              element.appendChild(opt);
              
            }
            //set default value for list
            if(_selected != null){
              element.value = _selected;
            }
            //selected value may be set from another dataset e.g. populate list and then set based on value to edit from another dataset
            
            break;
          case "default":
            value = db.datasets[_ds].data[0][item.value];   
            break;
          case "html":
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
          case "this":
          //do what; methods
          //if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
          //  value = element.value;
          //} else {
          //  value = element.innerHTML;
          //}
          //console.log('value', value);
          //console.log('item.method', Array.isArray(item.method));
          if (!Array.isArray(item.method)) {
            item.method = [item.method];
          }
          for (let method of item.method) {
            switch (method.toLowerCase()) {
              case "sanitize":
                value = SanitizeNumber(value);
                break;
              case "upper":
                value = value.toUpperCase();
                break;
              case "lower":
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
          case "clone":
          //value is name of new element
          var elementvalue = element.value;
          var value = <string>item.value;
          //if any actions
          // if (typeof item.action != "undefined" && item.action != null) {
          //   elementvalue = Transform(element.value, item.action);
          // }
          if (typeof item.method != "undefined" && item.method != null) {
            elementvalue = Transform(element.value, item.method);
          }
          var clone = document.getElementById(value);
  
          //If it isn't "undefined" and it isn't "null", then it exists.
          if (typeof clone != "undefined" && clone != null) {
            if (
              clone instanceof HTMLInputElement ||
              clone instanceof HTMLTextAreaElement
            ) {
              clone.value = elementvalue;
            }
          } else {
            const node = document.createElement("input");
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
          case "template":
          //HYDRATING TEMPLATE BASED ON CONTAINER
          //console.log('TEMPLATE BASED ON CONTAINER', item);
          /*
           add options for groups; filter, separate template
          */
  
          //assume the template container needs to start empty; does not seem to affect list of initial items i.e. services
          //cart is updated every time cart is modified; don't want to add more than one cart template
          //may need option to "clear" if multiple template are needed
          element.innerHTML = "";
          var _target = typeof item.target == "undefined" ? "dom" : item.target; //default to light dom
          var _templatename = item.name;
          //console.log(_target, _ds, _templatename);
          //_ds = item.datasource;
  
          var targetnode = element;
          // if (_target === "shadow") {
          //   targetnode = element.attachShadow({ mode: "open" });
          // }
  
          //loop over every record in dataset
          //console.log('');
          //console.log('_templatename', _templatename);
          //console.log(_rex.datasets[_ds]);
          const templatecss = document.getElementById(_templatename + "-css");
          if (templatecss != null) {
            if (templatecss instanceof HTMLTemplateElement) {
              var templateContentCss = templatecss.content.cloneNode(true);
              targetnode.appendChild(templateContentCss);
            }
          }
  
          //console.log('ITEM OBJECT', item);
          //console.log('_rex.datasets[_ds].data', _ds, _rex.datasets[_ds].data);
          //SET TO ARRAY IF OBJECT SO LOGIC REMAINS CONSISTENT
          var templateArray = Array.isArray(_rex.datasets[_ds].data)
            ? _rex.datasets[_ds].data
            : [_rex.datasets[_ds].data];
          for (let row of templateArray) {
            //console.log('');
            //console.log('DATASET ROW ---', row);
            const template = document.getElementById(_templatename);
            let templateContent = document.createElement("div");
  
            if (template instanceof HTMLTemplateElement) {
              templateContent.append(template.content.cloneNode(true));
  
              let attrClone;
              let attributes = Array.prototype.slice.call(template.attributes);
              while ((attrClone = attributes.pop())) {
                if (attrClone.nodeName.toLocaleLowerCase() != "id") {
                  templateContent.setAttribute(
                    attrClone.nodeName,
                    attrClone.nodeValue
                  );
                }
              }
              //console.log('templateContent ========================', templateContent);
              //console.log('targetnode ', targetnode);
  
              var templateelements =
                templateContent.querySelectorAll("[data-observe]");
                //targetnode.append("<div>Hullo</div>");

                // const test = document.getElementById("categorycontainer");
                // let templateContentTest = document.createElement("div");
                // templateContentTest.append("Hullo there");
                // test.append(templateContentTest);
                
                // const test2 = document.getElementById("servicecontainer");
                // let templateContentTest2 = document.createElement("div");
                // templateContentTest2.append("Hullo there " + targetnode.id);
                // test2.append(templateContentTest2);

              targetnode.append(templateContent);
              //targetnode.appendChild(templateContent);
              //var attr = document.createAttribute(thisobj.name);
              //var attrValue = row[thisobj.value];
              //attr.value = attrValue ;
              //templateelement.setAttributeNode(attr);
  
              //console.log('template', template);
              //console.log('templateContent', templateContent);
              //console.log('templateContent', templateContent.firstChild);
              //console.log('item.key', item.key);
  
              if (typeof item.key != "undefined") {
                var attrKey = document.createAttribute("data-key");
                //var attrKey = document.createAttribute('data-' + item.key);
                attrKey.value = row[item.key];
                templateContent.setAttributeNode(attrKey);
              }
  
              //console.log('thisobj data observe json', thisobj);
              //console.log('thisobj KEY', item.key, row[item.key]);
  
              //populate each element inside template
              for (let templateelement of templateelements as any) {
                var _dselement = "store";
                var _dfelement = "";
  
                let thisobserve = templateelement.getAttribute("data-observe");
                //var thisobjtemplate = JSON.parse(thisobserve)[0]; //what if template JSON HAS MORE THAN ONE object
                var thisobjtemplate = JSON.parse(thisobserve); //what if template JSON HAS MORE THAN ONE object
                //console.log("templateelement ", templateelement);
                //console.log("thisobjtemplate ", thisobjtemplate);
  
                /*
                if there is a key in the container data-observe json for the template; auto include it as an attribute at the template root
                */
                //console.log('thisobjtemplate data observe json', item);
                //console.log('thisobjtemplate data observe json', thisobjtemplate);
                //console.log('thisobjtemplate KEY', item.key);
                //console.log('template key?', templateContent);
  
                //console.log(thisobjtemplate);
                if (typeof thisobjtemplate.datasource !== "undefined") {
                  //can this be moved outside for loop
                  _ds = thisobjtemplate.datasource;
                }
                if (typeof thisobjtemplate.value !== "undefined") {
                  _df = thisobjtemplate.value;
                }
  
                if (typeof thisobjtemplate.datasource !== "undefined") {
                  _dselement = thisobjtemplate.datasource.replace(/-/g, "_");
                }
  
                //console.log('thisobjtemplate.type', thisobjtemplate.type);
                switch (thisobjtemplate.type) {
                  case "html":
                    var thisfield = thisobjtemplate.value;
                    console.log(thisfield);
                    console.log(_dselement, thisfield);
                    console.log(db.datasets[_dselement].data);
                    var itemPrepend =
                      thisobjtemplate.prepend != null
                        ? thisobjtemplate.prepend
                        : "";
                    var itemValue = row[thisobjtemplate.value];
                    var itemAppend =
                      thisobjtemplate.append != null
                        ? thisobjtemplate.append
                        : "";
                    var itemPrependPad =
                      thisobjtemplate.prependpad != null
                        ? thisobjtemplate.prependpad
                        : "";
                    var itemAppendPad =
                      thisobjtemplate.appendpad != null
                        ? thisobjtemplate.appendpad
                        : "";
  
                    if (db.datasets[_dselement].length > 1) {
                      itemValue = row[thisfield];
                      //templateelement.innerHTML = row[thisfield];
                    } else {
                      itemValue = row[thisfield];
                      //templateelement.innerHTML = row[thisfield] + ' ---';
                    }
                    templateelement.innerHTML =
                      itemPrepend +
                      itemPrependPad +
                      itemValue +
                      itemAppendPad +
                      itemAppend;
                    //item.classList.add(obj.value);
                    break;
                  case "attr":
                    /*
                    need conditional like 
                    if value = something then use defualt
                    if no photo use /assets/img/profile_photos/photo-profile-sm.png
                    conditional
  
                    if (row.hasphoto == '1') {
                    var conditionalOperand = row.conditional[thisobjtemplate.value];
                    var conditionalOperator = //row.conditional[thisobjtemplate.value];
                    var conditionalResult
                    Operand and Parameter are similar; operand is input to a function
  
  
                    */
                    //if {} then populate dynamically
                    //console.log('ATTRIBUTE: ', row, thisobjtemplate);
                    var attr = document.createAttribute(thisobjtemplate.name);
                    var attrPrepend =
                      thisobjtemplate.prepend != null
                        ? thisobjtemplate.prepend
                        : "";
                    var attrValue = row[thisobjtemplate.value];
                    var attrAppend =
                      thisobjtemplate.append != null
                        ? thisobjtemplate.append
                        : "";
                    var attrPrependPad =
                      thisobjtemplate.prependpad != null
                        ? thisobjtemplate.prependpad
                        : "";
                    var attrAppendPad =
                      thisobjtemplate.appendpad != null
                        ? thisobjtemplate.appendpad
                        : "";
                    var attrbustcache =
                      thisobjtemplate.bustcache != null &&
                      thisobjtemplate.bustcache == "true"
                        ? Date.now()
                        : "";
  
                    attr.value =
                      attrPrepend +
                      attrPrependPad +
                      attrValue +
                      attrAppendPad +
                      attrAppend +
                      attrbustcache;
                    templateelement.setAttributeNode(attr);
                    break;
                  case "function":
                    //console.log("function ", thisobjtemplate.value, thisobjtemplate);
                    var p = window[thisobjtemplate.value];
                    var params = row; //thisobjtemplate.params;
  
                    //do we need to check that cb is function
                    p(params).then(
                      function (response) {
                        //assuming xhr call callxhr(triggerobj);
                        templateelement.innerHTML = response;
                      },
                      function (error) {
                        console.error("Failed!", error);
                      }
                    );
  
                    //templateelement.innerHTML = "calling";
                    break;
                }
              }
            }
  
            //append template for each record in dataset
            //console.log('HEEERE',templateContent);
            //targetnode.appendChild(templateContent);
            
            
            //const para = document.createElement('p');
            //para.innerHTML = 'Hi';
            //targetnode.appendChild(para);
          }
  
          /*
           now that template has been appended to dom
           enable event handlers
  
  
  
           */
          var triggers = element.querySelectorAll("[data-trigger]"); // All with attribute named "property"
          //console.log('element', triggers.length, element)
          for (let trigger of triggers) {
            InitializeTrigger(trigger);
          } //end for triggers
  
          break;
          case "attr":
          //if {} then populate dynamically
          console.log("ATTRIBUTE: ", item);
          var attr = document.createAttribute(item.name);
          var attrPrepend = item.prepend != null ? item.prepend : "";
          var attrValue = db.datasets.store[item.value];
          var attrAppend = item.append != null ? item.append : "";
          var attrPrependPad = item.prependpad != null ? item.prependpad : "";
          var attrAppendPad = item.appendpad != null ? item.appendpad : "";
  
          attr.value =
            attrPrepend + attrPrependPad + attrValue + attrAppendPad + attrAppend;
          element.setAttributeNode(attr);
          break;
      }
    }
  
    //SET VALUE ONCE TO PREVENT FOIT - FLASH OF INVISIBLE TEXT
    if (value && value != "") {
      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement
      ) {
        element.value = value;
      } else {
        element.innerHTML = value;
      }
    }
  
  });  

}

function SetNavState(navelement, thisobj, condition) {
  //use NodeIterator.previousNode() to find container and the classes for enabled and disabled
  if (!navelement.classList.contains(thisobj.state.classactive)) {
    if (typeof condition.removeattribute != "undefined") {
      navelement.removeAttribute(condition.removeattribute);
    }
    if (typeof condition.setattribute != "undefined") {
      var attrvalue = "";
      if (typeof condition.setattributevalue != "undefined") {
        attrvalue = condition.setattributevalue;
      }
      navelement.setAttribute(condition.setattribute, attrvalue);
    }
    if (condition.type == "disabled") {
      navelement.classList.remove(thisobj.state.classenabled);
      navelement.classList.add(thisobj.state.classdisabled);
    } else {
      navelement.classList.remove(thisobj.state.classdisabled);
      navelement.classList.add(thisobj.state.classenabled);
    }
  }
}

function SanitizeNumber(_this) {
  return _this.replace(/[^0-9]/g, "");
}

function Transform(item, methods) {
  for (let method of methods) {
    switch (method) {
      case "sanitize":
        item = SanitizeNumber(item.value);
        break;
      case "upper":
        item = item.value.toUpperCase();
        break;
      case "lower":
        item = item.value.toLowerCase();
        break;
    }
  }
  return item;
}

function objToFormData(data) {
  const formData = new FormData();

  buildFormData(formData, data);
  return formData;
}

function buildFormData(formData, data, parentKey = null) {
  if (
    data &&
    typeof data === "object" &&
    !(data instanceof Date) &&
    !(data instanceof File)
  ) {
    Object.keys(data).forEach((key) => {
      buildFormData(
        formData,
        data[key],
        parentKey ? `${parentKey}[${key}]` : key
      );
    });
  } else {
    const value = data == null ? "" : data;
    formData.append(parentKey, value);
  }
}

type BoltObjType = {
  init: () => void;
  initCopyRight: () => void;
  GetDatasetByName: (datasetname: any) => void;
  RemoveDataset: (datasetname: any) => void;
  SetFont: (font: any) => void;
  // ... other properties ...
  InitDB: () => void;
};

let boltObj: BoltObjType = (function () {
  //var _baseurl = "https://5280clinic.com/xhr";
  var datasets = datasets || [];

  function getHelp() {
    var helpobj = { attribute: "", target: "" };
    helpobj.attribute = "data-route";
    helpobj.target = "id of <view> element";

    var help = { elements: new Array<typeof helpobj>() };
    help.elements = [];

    //helpobj = { "attribute": "data-route" };
    //helpobj = { "target": "id of <view> element" };
    //helpobj = { "target": [{ "name": "target_id", "condition": { "datasource": "name of datasource to check", "datafield": "field or column of data", "value": "value of that data" } }] };
    //helpobj = { "description": "trigger to route to a single view within a SPA. Target can be a single object to link or an array with route determined by logic" };
    help.elements.push(helpobj);

    helpobj.attribute = "data-routecontainer";
    helpobj.target = "id of container for data-route elements";
    help.elements.push(helpobj);

    return help;
  }

  function InitializeObservables3() {
    return new Promise(function (success, error) {
      const observedElements = document.querySelectorAll("[data-observe]");

      observedElements.forEach((element) => {
          const observeData = JSON.parse(element.getAttribute('data-observe')); // Parse the JSON string
          const { datasource } = observeData;
          console.log('datasource:', datasource);
          if (Array.isArray(datasource)) {
            for (let ds of datasource) {
              dataObserver.addObserver(ds, (data) => {
                // Assuming data is an array and we want the first item
                console.log('observer callback:', data);     
               });
            }
          }else{
            dataObserver.addObserver(datasource, (data) => {
              // Assuming data is an array and we want the first item
              console.log('observer callback:', data);   
             });
          }
      });
      
      // // Loop over each element and add an observer based on the data attribute
      // observedElements.forEach((element) => {
      //   console.log('element:', element);
      //   const observeData = JSON.parse(element.getAttribute('data-observe')); // Parse the JSON string
      //   console.log('datasource:', observeData.datasource);
      //   dataObserver.addObserver(observeData.datasource, (data) => {
      //     console.log('observer callback:', observeData);
      //   });
      //   dataObserver.notifyObservers("persistent");
      // });
      success("done"); // when successful
      error(); // when error
    });

  }

  function InitializeObservables() {
    //console.log('InitializeObservables() #####################################################################################################');
    return new Promise(function (success, error) {
      const observedElements = document.querySelectorAll("[data-observe]");

      // Loop over each element and add an observer based on the data attribute
      // Assuming data is an array and we want the first item

      //take all code to parse and loop though data-observe object 
      //add build up the value of the element here 
      //then add it after all manipulation is complete
      //any triggers that update data should then call the observer to update the element
      //look at 5280 clinic for all scenarios to trigger events and observers
      observedElements.forEach((element) => {
        MountElement(element); 
      });
      //dataObserver.notifyObservers("persistent-data");//should this be store
      success("done"); // when successful
      error(); // when error
    });
  }

  function InitialRoute() {
    //console.log("InitialRoute() #####################################################################################################");
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

      /*
        check _locationpath in view store
        if not found then show first view
        else show view in store
        all views are initially hidden
      */

      var viewfound = false;
      var _ds = "store";
      var views: NodeListOf<Element>;
      var _locationpath = window.location.pathname;
      if (_rex.datasets["viewstore"] && _rex.datasets["viewstore"].meta.count > 0) {
        //console.log('FOUND VIEW STORE');
        var _viewstore = _rex.datasets["viewstore"].data;
        for (let view of _viewstore) {
          if (view.locationpath == _locationpath) {
            //console.log('FOUND VIEW');
            var _view = document.getElementById(view.viewid);
            if (_view != null) {
              views = document.querySelectorAll('#' + view.viewid);
              viewfound = true;
            }
            break;
          }
        }
      }
      
      if(!viewfound){
        views = document.querySelectorAll("[data-view]"); // All with attribute named [this]
      }

      for (let view of views as any) {
        let viewjson = view.getAttribute("data-view");
        if (viewjson != null) {
          var obj = JSON.parse(viewjson);
          //attribute should always have a default value; for now
          if (typeof obj.default !== "undefined") {
            if (typeof obj.condition !== "undefined") {
              if (typeof obj.condition.datasource !== "undefined") {
                _ds = obj.condition.datasource;
                _ds = _ds.replace(/-/g, "_");
              }

              if (_rex.datasets[_ds].data[0][obj.condition.datafield] == obj.condition.value) {
                //SET NAV CLASS THEN SHOW VIEW
                //console.log('FOUND DEFAULT VIEW #####################################');
                //NAV ROUTE ##############################################################
                var routecontainers = document.querySelectorAll(
                  "[data-routecontainer]"
                );
                //could be more than one
                if (typeof routecontainers != "undefined") {
                  for (let routecontainer of routecontainers as any) {
                    //console.log('WORKING ROUTE CONTAINER ');
                    let routecontainerjson = routecontainer.getAttribute(
                      "data-routecontainer"
                    );
                    var routecontainerobj = JSON.parse(routecontainerjson);
                    var states = routecontainerobj.classstates;

                    var routes =
                      routecontainer.querySelectorAll("[data-route]"); // All with attribute named "property"
                    for (let route of routes) {
                      var routeobj = JSON.parse(
                        route.getAttribute("data-route")
                      );
                      //console.log('WORKING NAV ROUTE ', route);
                      //if route matches initial view
                      if (Array.isArray(routeobj.target)) {
                        //this means target is conditional and points to more than one view
                        //if any of the views match the view id then set to active
                        //console.log('LOOKING FOR ', view.id);
                        for (let target of routeobj.target) {
                          //console.log('TARGET ', target.name);
                          if (target.name == view.id) {
                            route.classList.remove(states.enabled); //in case all nav routes have enabled; should all potential classes be removed
                            route.classList.add(states.active);
                            break;
                          }
                        }
                      } else {
                        //console.log('TARGET ', routeobj.target);
                        if (routeobj.target == view.id) {
                          route.classList.remove(states.enabled); //in case all nav routes have been enabled; should all potential classes be removed
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

                view.style.display = "block";
                break;
              }
            } else {
              //need to set nav route class here too; create function call to keep DRY
              //this is the default view and should be the one and only
              view.style.display = "block";
            }
          }
        }else if(views.length == 1){
          //this is the default view and should be the one and only
          view.style.display = "block";
        }
        //this is where we can log issues finding or displaying views
      }
      /*
       we could error if we don't find good view
       options
       show first view element 
       if view options are set we can offer a code generated error view
       */
      success("done"); // when successful
      error(); // when error
    });
  }

  function dbXHR() {
    var xhrArgs = arguments[0];
    var cb = arguments[1];
    return new Promise((resolve, reject) => {
      //var xhrArgs = arguments[0];
      //var cb = arguments[1];
      //var _len = arguments.length
      //while (arguments.length > _len - 2) {
      //  Array.prototype.shift.apply(arguments);
      //}
      var _url = _baseurl; //"http://rock.skedmark.com/xhr";
      var _method = "POST"; //DEFAULT IS POST; USE OPTIONS TO CHANGE
      //var _thisDatasetRemote;
      if (_datasets_init_obj[xhrArgs] != undefined) {
        if (xhrArgs == "remote") {
          //######################################################################################################################
          //THIS DOES NOT ALLOW FOR MULTIPLE REMOTE CALLS, A BIT UNIQUE IN THAT SENSE; todo fix
          //######################################################################################################################
          for (let ds of _datasets_init_obj[xhrArgs]) {
            _thisDatasetRemote = <string>ds.dataset;
            _url = ds.url;
            _method = typeof ds.method != "undefined" ? ds.method : _method;
          }
        }
        //console.log('typeof xhrArgs', typeof xhrArgs);
        //console.log("xhrArgs", xhrArgs);
          
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///CREATE FORM OBJECT
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //add persistent data; only what is explicitly included; passing request params arbitrarily will result in unexpected consequences
        //NEED EXAMPLE BUT METHINKS REPORTS ARE PRIME EXAMPLE OF PARAMETER PASSED THAT SHOULD NOT BE CONTINUALLY ADDED TO NEXT REQUEST
        var formData = objToFormData(_rex.datasets.store.data[0]);

        //console.log('_rex.datasets', _rex.datasets);

        //add _datasets as queries
        var queryObj = { query: { name: "", datasets: [{ dataset: "" }] } };
        var xhrObj = { queries: new Array<typeof queryObj>() };
        //var _cleanDatasets = _datasets.system.replace(/-/g, "_");

        //could handle dataset aliases here; if typeof ds == 'string' then no alias;
        //if object then could be array of single procedure/alias ojects { "query": "clients", "dataset": "clients" }
        //if object has "datasets" element then multiple results expected for query; datasets: [{ "dataset": "clients" }, { "dataset": "barbers" }]

        //THIS WORKS FOR INITIAL API DATA REQUESTS AND MANUAL API CALLS USING 3 DIFFERENT FORMATS; STRING, ALIAS, AND MULTIPLE RESULTS FROM SINGLE QUERY
        //ALLOW REMOTE TO SET METHOD (POST/GET) ETC; ADDITIONA PARAMS; LETS CALL THESE OPTIONS
        //EACH REMOTE CALL SHOULD ALLOW FOR CUSTOM OPTIONS
        //NOW HANDLE TRIGGERED ELEMENTS LIKE BUTTON CLICKS
        //THIS WOULD ONLY BE FOR THE QUERIES CALLED; FORMS AND CRUD OBJECTS ARE POPULATED DIFFERENTLY

        for (let ds of _datasets_init_obj[xhrArgs]) {
          if (typeof ds == "string") {
            var queryObj = { query: { name: ds, datasets: [{ dataset: ds }] } };
            xhrObj.queries.push(queryObj);
          } else if (typeof ds == "object" && typeof ds.dataset != "undefined") {
            //{ "query": "formfield_firstname", "dataset": "firstnames" }, //example
            var queryObj = {
              query: {
                name: <string>ds.query,
                datasets: [{ dataset: <string>ds.dataset }],
              },
            };
            xhrObj.queries.push(queryObj);
          } else if (typeof ds == "object" && typeof ds.datasets != "undefined") {
            //{ "query": "public-get", "datasets": ["staff", "locations", "services"] }//example
            var dataset = { dataset: "" };
            var _datasets = new Array<typeof dataset>();
            for (let datasetname of ds.datasets) {
              var resultset = { dataset: "" };
              resultset.dataset = datasetname;
              _datasets.push(resultset);
            }
            var queryObj = { query: { name: <string>ds, datasets: _datasets } };
            xhrObj.queries.push(queryObj);
            //returns; {query:"public-get", datasets: [ {"dataset": "staff"}, { "dataset": "locations"}, { "dataset": "services"} ]}
          }
        }
        //console.log('xhrObj.queries', xhrObj.queries);
        formData.append("queries", JSON.stringify(xhrObj.queries));
        //add JWT
        //formData.append('JWT', JWT);

        for (let [name, value] of formData as any) {
          //alert(`${name} = ${value}`); // key1 = value1, then key2 = value2
          //console.log(`${name} = ${value}`);
        }

        //var _url = "http://domain/xhr";
        _xhrprocessing = true;
        var xhr = new XMLHttpRequest();
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
                  _rex.datasets[_thisDatasetRemote].all = all;
                  _rex.datasets[_thisDatasetRemote].meta = {
                    object: "false",
                    count: jsonObj.length,
                  };
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
                      this.tbl = JSON.parse(sessionStorage.getItem(dataset));
                    }
                    function unload() {
                      this.tbl = [];
                    }
                    //function all() { return this.data }
                    function where() {
                      return null;
                    }
                    function save() {
                      return null;
                    }
                    //_rex.datasets[Object.keys(obj)[0]].load = load;
                    //_rex.datasets[Object.keys(obj)[0]].unload = unload;
                    //_rex.datasets[Object.keys(obj)[0]].where = where;
                    //_rex.datasets[Object.keys(obj)[0]].load(dataset);
                    _rex.datasets[_thisDataset].all = all;

                    //_rex.datasets[Object.keys(obj)[0]] = data;

                    _rex.datasets[_thisDataset].meta = {
                      object: "false",
                      count: obj[Object.keys(obj)[0]].length,
                    };
                    _rex.datasets[_thisDataset].data = obj[Object.keys(obj)[0]];

                    //
                    var _dataset = ds.replace(/-/g, "_");
                    dataObserver.notifyObservers(_thisDataset);
                  }
                  _xhrprocessing = false;
                  typeof cb === "function" && cb(xhrArgs);
                }

                resolve("done"); // when successful
              } catch (e) {
                console.log('e',e);
                var cleanAttempt =
                  '{"root":[' + xhr.responseText.replace(/}{/g, "},{") + "]}";
                var cleanObj = JSON.parse(cleanAttempt);
                try {
                  var jsonObj = cleanObj["root"][cleanObj["root"].length - 1];
                  for (let obj of jsonObj.root) {
                    addDataset(obj, Object.keys(obj)[0]);
                    //console.log('clean');
                    //console.log('obj', obj);
                    //console.log('Object.keys(obj)[0]', Object.keys(obj)[0]);
                    var _dataset = Object.keys(obj)[0].replace(/-/g, "_");
                    if (obj[Object.keys(obj)[0]].length == 1) {
                      //console.log('save to sessionStorage 3');
                      //sessionStorage.setItem(Object.keys(obj)[0], JSON.stringify(obj[Object.keys(obj)[0]][0]));
                      //function all() { return obj[Object.keys(obj)[0]][0] }
                    } else {
                      if (obj[Object.keys(obj)[0]].length > 0) {
                        //console.log('save to sessionStorage 4');
                        //sessionStorage.setItem(Object.keys(obj)[0], JSON.stringify(obj[Object.keys(obj)[0]]));
                        //function all() { return obj[Object.keys(obj)[0]] }
                      } else {
                        console.log("not saving to sessionStorage catch");
                      }
                    }
                    //this.tbl = JSON.parse(sessionStorage.getItem(dataset))
                    //function all() { return obj[Object.keys(obj)[0]][0] }
                    //DB[_dataset].load = load;
                    //DB[_dataset].load();
                    //DB[_dataset].all = all;
                  }
                  _xhrprocessing = false;
                  typeof cb === "function" && cb(xhrArgs);
                } catch (e) {
                  console.log(e);
                }
                reject(); // when error
              }

              //todo: make mount a promise followed by lazy load
              //add view load any time view changes; add flag to call only once vs multiple times
              //finally
              //InitialMount();
              //InitialRoute();
            }
          } else {
            _xhrprocessing = false;
            typeof cb === "function" && cb(false);
          }
        };
        /// Send the Data.
        xhr.send(formData);

      }else{
        resolve("done"); // when successful
      }

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

  function setFont(font) {
    //todo
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
      console.log("hi2");
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
      var apiobject = { type: "", object: null };
      apiobject.type = "method";
      apiobject.object = object;
      //get methods
      console.log('ApiCall:', object);
      if (object.callbefore != undefined) {
        var cb = window[object.callbefore.function] as unknown as (
          ...args: any[]
        ) => any;
        var cbparams = object.callbefore.params;
  
        if (typeof cb === "function") {
          Promise.resolve(cb(...cbparams)).then(
            function (response) {
              apicontrol.start(apiobject);
            },
            function (error) {
              console.error("call before Failed!", error);
              apicontrol.start(apiobject);
            }
          );
        }        
      } else {
        apicontrol.start(apiobject);
      }

    },
    InitDB: function () {
      InitializeObservables() //set all observable classes
        .then(() => dbXHR.apply(null, ["load"])) //api call to get load datasets
        //OBSERVER IS NOTIFIED AFTER EVERY XHR CALL SO NO NEED TO NOTIFY HERE
        //.then(() => MountDatasetList("persistent_store")) //mount load datasets
        //.then(() => MountDatasetList("load")) //mount load datasets
        //.then(() => InitialMount())//remove initial class config so initial is separate from mount
        .then(() => InitialRoute()) //this should be fine
        .then(() => dbXHR.apply(null, ["remote"])) // api call to get remote datasets
        //.then(() => MountDatasetList("remote")) //mount remote datasets
        .then(() => dbXHR.apply(null, ["lazyload"])) //api call to get lazyload datasets
        .then(() => { 
          if (document.querySelector('.page-wrapper')) {
            const element = document.querySelector('.page-wrapper') as HTMLElement;
            element.style.display = 'block';
          }
         }
        ) //show page wrapper
        .then(() => typeof pageinit === 'function' && pageinit()) //mount lazyload datasets
        .then(() => typeof pageloaded === 'function' && pageloaded()) //mount lazyload datasets
        //.then(() => MountDatasetList("lazyload")) //mount lazyload datasets
        .catch((e) => {
          console.log("Error initializing datasets:", e);
        });
    },
  };
})();

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///UTILS
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
document.addEventListener("keydown", function (e) {
  if (e.ctrlKey && e.altKey && e.key === "p") {
    // case sensitive
    _consoleObj.priority = !_consoleObj.priority;
    ToggleConsole("priority");
  }
  if (e.ctrlKey && e.altKey && e.key === "l") {
    // case sensitive
    _consoleObj.log = !_consoleObj.log;
    ToggleConsole("log");
  }
  if (e.ctrlKey && e.altKey && e.key === "i") {
    // case sensitive
    _consoleObj.info = !_consoleObj.info;
    ToggleConsole("info");
  }
  if (e.ctrlKey && e.altKey && e.key === "w") {
    // case sensitive
    _consoleObj.warning = !_consoleObj.warning;
    ToggleConsole("warning");
  }
  if (e.ctrlKey && e.altKey && e.key === "e") {
    // case sensitive
    _consoleObj.error = !_consoleObj.error;
    ToggleConsole("error");
  }
  if (e.ctrlKey && e.altKey && e.key === "d") {
    // case sensitive
    _consoleObj.debug = !_consoleObj.debug;
    ToggleConsole("debug");
  }
  if (e.ctrlKey && e.altKey && e.key === "v") {
    // case sensitive
    _consoleObj.verbose = !_consoleObj.verbose;
    ToggleConsole("verbose");
  }
  if (e.ctrlKey && e.altKey && e.key === "L") {
    // case sensitive
    _consoleObj.priority = !_consoleObj.priority;
    _consoleObj.log = !_consoleObj.log;
    _consoleObj.info = !_consoleObj.info;
    _consoleObj.warning = !_consoleObj.warning;
    _consoleObj.debug = !_consoleObj.debug;
    _consoleObj.error = !_consoleObj.error;
    _consoleObj.verbose = !_consoleObj.verbose;
  }
  if (e.ctrlKey && e.altKey && e.key === "C") {
    // case sensitive
    Logger.toggle();
  }
});

function ToggleConsole(method) {
  //FormatConsole(method.charAt(0).toUpperCase() + method.slice(1) + ' on: ' + _consoleObj[method], 'console');
  console["format"](
    method.charAt(0).toUpperCase() +
      method.slice(1) +
      " on: " +
      _consoleObj[method],
    "console"
  );

  if (
    _consoleObj.priority ||
    _consoleObj.log ||
    _consoleObj.info ||
    _consoleObj.warning ||
    _consoleObj.debug ||
    _consoleObj.error ||
    _consoleObj.verbose
  ) {
    //Logger.open();
  } else {
    //Logger.close();
  }
}

console["format"] = function FormatConsole(message, method) {
  if (_consoleObj[method]) {
    if (typeof message === "object") {
      ///NOT SURE OBJECT CAN BE FORMATTED YET
      console.log("%c:OBJECT: ", "color:#000;font-size:12pt;");
      switch (method) {
        case "log":
          console.log(message);
          break;
        case "info":
          console.info(message);
          break;
        case "debug":
          console.debug(message);
          break;
        case "error":
          console.error(message);
          break;
        default:
          console.log(message);
          break;
      }
    } else {
      var logmethod = "log";
      var windowWidth = 120;
      var _padding = windowWidth - message.length;
      var formatcolor = "#000";
      var formatsize = "14";
      var formatseparator = "-";
      switch (method) {
        case "priority":
          logmethod = "info";
          formatcolor = "red";
          break;
        case "log":
          formatcolor = "#000";
          break;
        case "info":
          logmethod = method;
          formatcolor = "#edc045";
          break;
        case "warning":
          logmethod = "warn";
          formatcolor = "orangered";
          break;
        case "debug":
          //logmethod = method;///debug only works if console has debugging turned on
          formatcolor = "#c7aafd";
          var formatsize = "10";
          formatseparator = "=";
          break;
        case "error":
          logmethod = method;
          formatcolor = "red";
          formatseparator = "@";
          break;
        case "verbose":
          formatcolor = "#c7aafd";
          var formatsize = "10";
          formatseparator = "";
          break;
        case "separator":
          formatcolor = "#000";
          var formatsize = "16";
          formatseparator = "#";
          break;
        case "console":
          formatcolor = "#000";
          break;
      }
      message += " ";
      for (var i = 0; i < _padding; i++) {
        message += formatseparator;
      }
      if (_consoleObj.lastmethod == "") {
        console.group(method);
        _consoleObj.lastmethod = method;
      } else if (_consoleObj.lastmethod != method) {
        console.groupEnd();
        _consoleObj.lastmethod = method;
        console.group(method);
      }
      console[logmethod](
        "%c:" + message,
        "color: " + formatcolor + ";font-size:" + formatsize + "pt;"
      );
      log(message);
    }
  }
};

function log(msg) {
  if (arguments.length == 0) Logger.print(""); // print a blank line
  else Logger.print(msg);
}

let Logger = (function () {
  "use strict";

  ///////////////////////////////////////////////////////////////////////////
  // private members
  ///////////////////////////////////////////////////////////////////////////
  let version = "1.19";
  let containerDiv = null;
  let tabDiv = null;
  let logDiv = null;
  let visible = true; // flag for visibility
  let opened = false; // flag for toggle on/off
  let enabled = true; // does not accept log messages any more if it is false
  let logHeight = 215; // 204 + 2*padding + border-top
  let tabHeight = 20;
  // for animation
  let animTime = 0;
  let animDuration = 200; // ms
  let animFrameTime = 16; // ms

  ///////////////////////////////////////////////////////////////////////////
  // get time and date as string with a trailing space
  let getTime = function () {
    let now = new Date();
    let hour = "0" + now.getHours();
    hour = hour.substring(hour.length - 2);
    let minute = "0" + now.getMinutes();
    minute = minute.substring(minute.length - 2);
    let second = "0" + now.getSeconds();
    second = second.substring(second.length - 2);
    return hour + ":" + minute + ":" + second;
  };
  let getDate = function () {
    let now = new Date();
    let year = "" + now.getFullYear();
    let month = "0" + (now.getMonth() + 1);
    month = month.substring(month.length - 2);
    let date = "0" + now.getDate();
    date = date.substring(date.length - 2);
    return year + "-" + month + "-" + date;
  };
  ///////////////////////////////////////////////////////////////////////////
  // return available requestAnimationFrame(), otherwise, fallback to setTimeOut
  let getRequestAnimationFrameFunction = function () {
    if (window.requestAnimationFrame)
      return function (callback) {
        return requestAnimationFrame(callback);
      };
    else
      return function (callback) {
        return setTimeout(callback, 16);
      };
  };

  ///////////////////////////////////////////////////////////////////////////
  // public members
  ///////////////////////////////////////////////////////////////////////////
  let self = {
    ///////////////////////////////////////////////////////////////////////
    // create a div for log and attach it to document
    init: function () {
      // avoid redundant call
      if (containerDiv) return true;

      // check if DOM is ready
      if (
        !document ||
        !document.createElement ||
        !document.body ||
        !document.body.appendChild
      )
        return false;

      // constants
      let CONTAINER_DIV = "loggerContainer";
      let TAB_DIV = "loggerTab";
      let LOG_DIV = "logger";
      let Z_INDEX = 9999;

      // create logger DOM element
      containerDiv = document.getElementById(CONTAINER_DIV);
      if (!containerDiv) {
        // container
        containerDiv = document.createElement("div");
        containerDiv.id = CONTAINER_DIV;
        containerDiv.setAttribute(
          "style",
          "width:100%;" +
            "margin:0;" +
            "padding:0;" +
            "text-align:left;" +
            "box-sizing:border-box;" +
            "position:fixed;" +
            "left:0;" +
            "z-index:" +
            Z_INDEX +
            ";" +
            "bottom:" +
            -logHeight +
            "px;"
        ); /* hide it initially */

        // tab
        //tabDiv = document.createElement("div");
        //tabDiv.id = TAB_DIV;
        ////tabDiv.appendChild(document.createTextNode("LOG"));
        //tabDiv.setAttribute("style", "width:40px;" +
        //  "box-sizing:border-box;" +
        //  "overflow:hidden;" +
        //  "font:bold 10px verdana,helvetica,sans-serif;" +
        //  "line-height:" + (tabHeight - 1) + "px;" +  /* subtract top-border */
        //  "color:#fff;" +
        //  "position:absolute;" +
        //  "left:20px;" +
        //  "top:" + -tabHeight + "px;" +
        //  "margin:0; padding:0;" +
        //  "text-align:center;" +
        //  "border:1px solid #aaa;" +
        //  "border-bottom:none;" +
        //  /*"background:#333;" + */
        //  "background:rgba(0,0,0,0.8);" +
        //  "border-top-right-radius:8px;" +
        //  "border-top-left-radius:8px;");
        //// add mouse event handlers
        //tabDiv.onmouseover = function () {
        //  this.style.cursor = "pointer";
        //  this.style.textShadow = "0 0 1px #fff, 0 0 2px #0f0, 0 0 6px #0f0";
        //};
        //tabDiv.onmouseout = function () {
        //  this.style.cursor = "auto";
        //  this.style.textShadow = "none";
        //};
        //tabDiv.onclick = function () {
        //  Logger.toggle();
        //  this.style.textShadow = "none";
        //};

        // log message
        logDiv = document.createElement("div");
        logDiv.id = LOG_DIV;
        logDiv.setAttribute(
          "style",
          "font:12px monospace;" +
            "height: " +
            logHeight +
            "px;" +
            "box-sizing:border-box;" +
            "color:#fff;" +
            "overflow-x:hidden;" +
            "overflow-y:scroll;" +
            "visibility:hidden;" +
            "position:relative;" +
            "bottom:0px;" +
            "margin:0px;" +
            "padding:5px;" +
            /*"background:#333;" + */
            "background:rgba(0,0,0,1);" +
            "border-top:1px solid #aaa;"
        );

        // style for log message
        let span = document.createElement("span"); // for coloring text
        span.style.color = "#afa";
        span.style.fontWeight = "bold";

        // the first message in log
        let msg =
          "===== Log Started at " +
          getDate() +
          ", " +
          getTime() +
          ", " +
          "(Logger version " +
          version +
          ") " +
          "=====";

        span.appendChild(document.createTextNode(msg));
        logDiv.appendChild(span);
        logDiv.appendChild(document.createElement("br")); // blank line
        logDiv.appendChild(document.createElement("br")); // blank line

        // add divs to document
        //containerDiv.appendChild(tabDiv);
        containerDiv.appendChild(logDiv);
        document.body.appendChild(containerDiv);
      }

      return true;
    },
    ///////////////////////////////////////////////////////////////////////
    // print log message to logDiv
    print: function (msg) {
      // ignore message if it is disabled
      if (!enabled) return;

      // check if this object is initialized
      if (!containerDiv) {
        let ready = this.init();
        if (!ready) return;
      }

      let msgDefined = true;

      // convert non-string type to string
      if (typeof msg == "undefined") {
        // print "undefined" if param is not defined
        msg = "undefined";
        msgDefined = false;
      } else if (typeof msg == "function") {
        // print "function" if param is function ptr
        msg = "function";
        msgDefined = false;
      } else if (msg === null) {
        // print "null" if param has null value
        msg = "null";
        msgDefined = false;
      } else {
        if (msg instanceof Array) {
          // print array elements if param is array object
          msg = this.arrayToString(msg);
        } else if (msg instanceof Object) {
          // invoke toString() if param is object type
          msg = msg.toString();
        } else {
          msg += ""; // for other types
        }
      }

      let lines = msg.split(/\r\n|\r|\n/);
      for (let i = 0, c = lines.length; i < c; ++i) {
        // format time and put the text node to inline element
        let timeDiv = document.createElement("div"); // color for time
        timeDiv.setAttribute("style", "color:#999;" + "float:left;");

        let timeNode = document.createTextNode(getTime() + "\u00a0");
        timeDiv.appendChild(timeNode);

        // create message span
        let msgDiv = document.createElement("div");
        msgDiv.setAttribute(
          "style",
          "word-wrap:break-word;" + // wrap msg
            "margin-left:6.0em;"
        ); // margin-left = 9 * ?
        if (!msgDefined) msgDiv.style.color = "#afa"; // override color if msg is not defined

        // put message into a text node
        let line = lines[i].replace(/ /g, "\u00a0");
        let msgNode = document.createTextNode(line);
        msgDiv.appendChild(msgNode);

        // new line div with clearing css float property
        let newLineDiv = document.createElement("div");
        newLineDiv.setAttribute("style", "clear:both;");

        logDiv.appendChild(timeDiv); // add time
        logDiv.appendChild(msgDiv); // add message
        logDiv.appendChild(newLineDiv); // add message

        logDiv.scrollTop = logDiv.scrollHeight; // scroll to last line
      }
    },
    ///////////////////////////////////////////////////////////////////////
    // slide log container up and down
    toggle: function () {
      if (opened)
        // if opened, close the window
        this.close();
      // if closed, open the window
      else this.open();
    },
    open: function () {
      if (!this.init()) return;
      if (!visible) return;
      if (opened) return;

      logDiv.style.visibility = "visible";
      animTime = Date.now();
      let requestAnimationFrame = getRequestAnimationFrameFunction();
      requestAnimationFrame(slideUp);
      function slideUp() {
        let duration = Date.now() - animTime;
        if (duration >= animDuration) {
          containerDiv.style.bottom = 0;
          opened = true;
          return;
        }
        let y = Math.round(
          -logHeight *
            (1 - 0.5 * (1 - Math.cos((Math.PI * duration) / animDuration)))
        );
        containerDiv.style.bottom = "" + y + "px";
        requestAnimationFrame(slideUp);
      }
    },
    close: function () {
      if (!this.init()) return;
      if (!visible) return;
      if (!opened) return;

      animTime = Date.now();
      let requestAnimationFrame = getRequestAnimationFrameFunction();
      requestAnimationFrame(slideDown);
      function slideDown() {
        let duration = Date.now() - animTime;
        if (duration >= animDuration) {
          containerDiv.style.bottom = "" + -logHeight + "px";
          logDiv.style.visibility = "hidden";
          opened = false;
          return;
        }
        let y = Math.round(
          -logHeight * 0.5 * (1 - Math.cos((Math.PI * duration) / animDuration))
        );
        containerDiv.style.bottom = "" + y + "px";
        requestAnimationFrame(slideDown);
      }
    },
    ///////////////////////////////////////////////////////////////////////
    // open log container
    show: function () {
      this.open();
    },
    ///////////////////////////////////////////////////////////////////////
    // close log container
    hide: function () {
      this.close();
    },
    ///////////////////////////////////////////////////////////////////////
    // show/hide the logger window and tab
    // show: function () {
    //   if (!this.init())
    //     return;

    //   containerDiv.style.display = "block";
    //   visible = true;
    // },
    // hide: function () {
    //   if (!this.init())
    //     return;

    //   containerDiv.style.display = "none";
    //   visible = false;
    // },
    ///////////////////////////////////////////////////////////////////////
    // when Logger is enabled (default), log() method will write its message
    // to the console ("logDiv")
    enable: function () {
      if (!this.init()) return;

      enabled = true;
      tabDiv.style.color = "#fff";
      logDiv.style.color = "#fff";
    },
    ///////////////////////////////////////////////////////////////////////
    // when it is diabled, subsequent log() calls will be ignored and
    // the message won't be written on "logDiv".
    // "LOG" tab and log text are grayed out to indicate it is disabled.
    disable: function () {
      if (!this.init()) return;

      enabled = false;
      tabDiv.style.color = "#666";
      logDiv.style.color = "#666";
    },
    ///////////////////////////////////////////////////////////////////////
    // clear all messages from logDiv
    clear: function () {
      if (!this.init()) return;

      logDiv.innerHTML = "";
    },
    ///////////////////////////////////////////////////////////////////////
    // utility funtions
    arrayToString: function (array) {
      let str = "[";
      for (let i = 0, c = array.length; i < c; ++i) {
        if (array[i] instanceof Array) str += this.arrayToString(array[i]);
        else str += array[i];

        if (i < c - 1) str += ", ";
      }
      str += "]";
      return str;
    },
  };
  return self;
})();
//Logger.show();

function downloadCSV(filename, jsonObj, delimiter) {
  var data = ConvertToCSV(jsonObj, delimiter);
  var c = document.createElement("a");
  c.download = filename;

  var t = new Blob([data], {
    type: "text/csv",
  });
  c.href = window.URL.createObjectURL(t);
  c.click();
}

function ConvertToCSV(objArray, delimiter) {
  var array = typeof objArray != "object" ? JSON.parse(objArray) : objArray;
  var str = "";

  var line = "";
  for (let key in array[0]) {
    console.log("key", key);
    if (key != "undefined") {
      if (line != "") line += delimiter;
      line += key;
    }
  }
  str += line + "\r\n";

  for (var i = 0; i < array.length; i++) {
    var line = "";
    for (var index in array[i]) {
      if (line != "") line += delimiter;

      line += array[i][index];
    }

    str += line + "\r\n";
  }

  return str;
}

function decodeTrustedEntities(encodedString) {
  var textArea = document.createElement("textarea");
  textArea.innerHTML = encodedString;
  //remove textArea
  return textArea.value;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//JSON LOGIC
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/* globals define,module */
/*
Using a Universal Module Loader that should be browser, require, and AMD friendly
http://ricostacruz.com/cheatsheets/umdjs.html
*/
// ; (function (root, factory) {
//   if (typeof define === "function" && define.amd) {
//     define(factory);
//   } else if (typeof exports === "object") {
//     module.exports = factory();
//   } else {
//     root.jsonLogic = factory();
//   }
// }(this, function () {
//   "use strict";
/* globals console:false */

// if (!Array.isArray) {
//   Array.isArray = function (arg) {
//     return Object.prototype.toString.call(arg) === "[object Array]";
//   };
// }

/**
 * Return an array that contains no duplicates (original not modified)
 * @param  {array} array   Original reference array
 * @return {array}         New array with no duplicates
 */
function arrayUnique(array) {
  var a = [];
  for (var i = 0, l = array.length; i < l; i++) {
    if (a.indexOf(array[i]) === -1) {
      a.push(array[i]);
    }
  }
  return a;
}

interface JsonLogic {
  truthy(a: any): unknown;
  apply(arg0: { var: any }, arg1: any): unknown;
  get_operator: (logic: any) => string;
  get_values: (logic: any) => any;
  uses_data: (logic: any) => any[];
  add_operation: (name: any, code: any) => void;
  rm_operation: (name: any) => void;
  rule_like: (rule: any, pattern: any) => any;
  is_logic?: (logic: any) => boolean;
  // Add other properties here as needed
}

var jsonLogic: JsonLogic = {
  truthy: function (a: any): unknown {
    throw new Error("Function not implemented.");
  },
  apply: function (arg0: { var: any }, arg1: any): unknown {
    throw new Error("Function not implemented.");
  },
  get_operator: function (logic: any): string {
    throw new Error("Function not implemented.");
  },
  get_values: function (logic: any) {
    throw new Error("Function not implemented.");
  },
  uses_data: function (logic: any): any[] {
    throw new Error("Function not implemented.");
  },
  add_operation: function (name: any, code: any): void {
    throw new Error("Function not implemented.");
  },
  rm_operation: function (name: any): void {
    throw new Error("Function not implemented.");
  },
  rule_like: function (rule: any, pattern: any) {
    throw new Error("Function not implemented.");
  },
};

type JsonLogicInput = { var: any } | { missing: any };
var operations = {
  "==": function (a, b) {
    return a == b;
  },
  "===": function (a, b) {
    return a === b;
  },
  "!=": function (a, b) {
    return a != b;
  },
  "!==": function (a, b) {
    return a !== b;
  },
  ">": function (a, b) {
    return a > b;
  },
  ">=": function (a, b) {
    return a >= b;
  },
  "<": function (a, b, c) {
    return c === undefined ? a < b : a < b && b < c;
  },
  "<=": function (a, b, c) {
    return c === undefined ? a <= b : a <= b && b <= c;
  },
  "!!": function (a) {
    return jsonLogic.truthy(a);
  },
  "!": function (a) {
    return !jsonLogic.truthy(a);
  },
  "%": function (a, b) {
    return a % b;
  },
  log: function (a) {
    console.log(a);
    return a;
  },
  in: function (a, b) {
    if (!b || typeof b.indexOf === "undefined") return false;
    return b.indexOf(a) !== -1;
  },
  cat: function () {
    return Array.prototype.join.call(arguments, "");
  },
  substr: function (source, start, end) {
    if (end < 0) {
      // JavaScript doesn't support negative end, this emulates PHP behavior
      var temp = String(source).substr(start);
      return temp.substr(0, temp.length + end);
    }
    return String(source).substr(start, end);
  },
  "+": function () {
    return Array.prototype.reduce.call(
      arguments,
      function (a, b) {
        return parseFloat(a) + parseFloat(b);
      },
      0
    );
  },
  "*": function () {
    return Array.prototype.reduce.call(arguments, function (a, b) {
      return parseFloat(a) * parseFloat(b);
    });
  },
  "-": function (a, b) {
    if (b === undefined) {
      return -a;
    } else {
      return a - b;
    }
  },
  "/": function (a, b) {
    return a / b;
  },
  min: function () {
    return Math.min.apply(this, arguments);
  },
  max: function () {
    return Math.max.apply(this, arguments);
  },
  merge: function () {
    return Array.prototype.reduce.call(
      arguments,
      function (a, b) {
        return a.concat(b);
      },
      []
    );
  },
  var: function (a, b) {
    var not_found = b === undefined ? null : b;
    var data = this;
    if (typeof a === "undefined" || a === "" || a === null) {
      return data;
    }
    var sub_props = String(a).split(".");
    for (var i = 0; i < sub_props.length; i++) {
      if (data === null) {
        return not_found;
      }
      // Descending into data
      data = data[sub_props[i]];
      if (data === undefined) {
        return not_found;
      }
    }
    return data;
  },
  missing: function () {
    /*
      Missing can receive many keys as many arguments, like {"missing:[1,2]}
      Missing can also receive *one* argument that is an array of keys,
      which typically happens if it's actually acting on the output of another command
      (like 'if' or 'merge')
      */

    var missing = [];
    var keys = Array.isArray(arguments[0]) ? arguments[0] : arguments;

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var value = jsonLogic.apply({ var: key }, this);
      if (value === null || value === "") {
        missing.push(key);
      }
    }

    return missing;
  },
  missing_some: function (need_count, options) {
    // missing_some takes two arguments, how many (minimum) items must be present, and an array of keys (just like 'missing') to check for presence.
    var are_missing = (jsonLogic.apply = function (
      input: JsonLogicInput,
      thisArg: any
    ) {
      if (options.length - are_missing.length >= need_count) {
        return [];
      } else {
        return are_missing;
      }
    });
  },
  method: function (obj, method, args) {
    return obj[method].apply(obj, args);
  },
};

jsonLogic.is_logic = function (logic) {
  return (
    typeof logic === "object" && // An object
    logic !== null && // but not null
    !Array.isArray(logic) && // and not an array
    Object.keys(logic).length === 1 // with exactly one key
  );
};

/*
  This helper will defer to the JsonLogic spec as a tie-breaker when different language interpreters define different behavior for the truthiness of primitives.  E.g., PHP considers empty arrays to be falsy, but Javascript considers them to be truthy. JsonLogic, as an ecosystem, needs one consistent answer.

  Spec and rationale here: http://jsonlogic.com/truthy
  */
jsonLogic.truthy = function (value) {
  if (Array.isArray(value) && value.length === 0) {
    return false;
  }
  return !!value;
};

jsonLogic.get_operator = function (logic) {
  return Object.keys(logic)[0];
};

jsonLogic.get_values = function (logic) {
  return logic[jsonLogic.get_operator(logic)];
};

jsonLogic.apply = function (logic, data) {
  // Does this array contain logic? Only one way to find out.
  if (Array.isArray(logic)) {
    return logic.map(function (l) {
      return jsonLogic.apply(l, data);
    });
  }
  // You've recursed to a primitive, stop!
  if (!jsonLogic.is_logic(logic)) {
    return logic;
  }

  data = data || {};

  var op = jsonLogic.get_operator(logic);
  var values = logic[op];
  var i;
  var current;
  var scopedLogic, scopedData, filtered, initial;

  // easy syntax for unary operators, like {"var" : "x"} instead of strict {"var" : ["x"]}
  if (!Array.isArray(values)) {
    values = [values];
  }

  // 'if', 'and', and 'or' violate the normal rule of depth-first calculating consequents, let each manage recursion as needed.
  if (op === "if" || op == "?:") {
    /* 'if' should be called with a odd number of parameters, 3 or greater
      This works on the pattern:
      if( 0 ){ 1 }else{ 2 };
      if( 0 ){ 1 }else if( 2 ){ 3 }else{ 4 };
      if( 0 ){ 1 }else if( 2 ){ 3 }else if( 4 ){ 5 }else{ 6 };

      The implementation is:
      For pairs of values (0,1 then 2,3 then 4,5 etc)
      If the first evaluates truthy, evaluate and return the second
      If the first evaluates falsy, jump to the next pair (e.g, 0,1 to 2,3)
      given one parameter, evaluate and return it. (it's an Else and all the If/ElseIf were false)
      given 0 parameters, return NULL (not great practice, but there was no Else)
      */
    for (i = 0; i < values.length - 1; i += 2) {
      if (jsonLogic.truthy(jsonLogic.apply(values[i], data))) {
        return jsonLogic.apply(values[i + 1], data);
      }
    }
    if (values.length === i + 1) return jsonLogic.apply(values[i], data);
    return null;
  } else if (op === "and") {
    // Return first falsy, or last
    for (i = 0; i < values.length; i += 1) {
      current = jsonLogic.apply(values[i], data);
      if (!jsonLogic.truthy(current)) {
        return current;
      }
    }
    return current; // Last
  } else if (op === "or") {
    // Return first truthy, or last
    for (i = 0; i < values.length; i += 1) {
      current = jsonLogic.apply(values[i], data);
      if (jsonLogic.truthy(current)) {
        return current;
      }
    }
    return current; // Last
  } else if (op === "filter") {
    scopedData = jsonLogic.apply(values[0], data);
    scopedLogic = values[1];

    if (!Array.isArray(scopedData)) {
      return [];
    }
    // Return only the elements from the array in the first argument,
    // that return truthy when passed to the logic in the second argument.
    // For parity with JavaScript, reindex the returned array
    return scopedData.filter(function (datum) {
      return jsonLogic.truthy(jsonLogic.apply(scopedLogic, datum));
    });
  } else if (op === "map") {
    scopedData = jsonLogic.apply(values[0], data);
    scopedLogic = values[1];

    if (!Array.isArray(scopedData)) {
      return [];
    }

    return scopedData.map(function (datum) {
      return jsonLogic.apply(scopedLogic, datum);
    });
  } else if (op === "reduce") {
    scopedData = jsonLogic.apply(values[0], data);
    scopedLogic = values[1];
    initial = typeof values[2] !== "undefined" ? values[2] : null;

    if (!Array.isArray(scopedData)) {
      return initial;
    }

    return scopedData.reduce(function (accumulator, current) {
      return jsonLogic.apply(scopedLogic, {
        current: current,
        accumulator: accumulator,
      });
    }, initial);
  } else if (op === "all") {
    scopedData = jsonLogic.apply(values[0], data);
    scopedLogic = values[1];
    // All of an empty set is false. Note, some and none have correct fallback after the for loop
    if (!scopedData.length) {
      return false;
    }
    for (i = 0; i < scopedData.length; i += 1) {
      if (!jsonLogic.truthy(jsonLogic.apply(scopedLogic, scopedData[i]))) {
        return false; // First falsy, short circuit
      }
    }
    return true; // All were truthy
    // } else if (op === "none") {
    //   filtered = jsonLogic.apply({ 'filter': values }, data);
    //   return filtered.length === 0;

    // } else if (op === "some") {
    //   filtered = jsonLogic.apply({ 'filter': values }, data);
    //   return filtered.length > 0;
  }

  // Everyone else gets immediate depth-first recursion
  values = values.map(function (val) {
    return jsonLogic.apply(val, data);
  });

  // The operation is called with "data" bound to its "this" and "values" passed as arguments.
  // Structured commands like % or > can name formal arguments while flexible commands (like missing or merge) can operate on the pseudo-array arguments
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments
  if (typeof operations[op] === "function") {
    return operations[op].apply(data, values);
  } else if (op.indexOf(".") > 0) {
    // Contains a dot, and not in the 0th position
    var sub_ops = String(op).split(".");
    var operation = operations;
    for (i = 0; i < sub_ops.length; i++) {
      // Descending into operations
      operation = operation[sub_ops[i]];
      if (operation === undefined) {
        throw new Error(
          "Unrecognized operation " +
            op +
            " (failed at " +
            sub_ops.slice(0, i + 1).join(".") +
            ")"
        );
      }
    }
    //return operation.apply(data, values);
    return operation[op].apply(data, values);
  }

  throw new Error("Unrecognized operation " + op);
};

jsonLogic.uses_data = function (logic) {
  var collection = [];

  if (jsonLogic.is_logic(logic)) {
    var op = jsonLogic.get_operator(logic);
    var values = logic[op];

    if (!Array.isArray(values)) {
      values = [values];
    }

    if (op === "var") {
      // This doesn't cover the case where the arg to var is itself a rule.
      collection.push(values[0]);
    } else {
      // Recursion!
      values.map(function (val) {
        collection.push.apply(collection, jsonLogic.uses_data(val));
      });
    }
  }

  return arrayUnique(collection);
};

jsonLogic.add_operation = function (name, code) {
  operations[name] = code;
};

jsonLogic.rm_operation = function (name) {
  delete operations[name];
};

jsonLogic.rule_like = function (rule, pattern) {
  // console.log("Is ". JSON.stringify(rule) . " like " . JSON.stringify(pattern) . "?");
  if (pattern === rule) {
    return true;
  } // TODO : Deep object equivalency?
  if (pattern === "@") {
    return true;
  } // Wildcard!
  if (pattern === "number") {
    return typeof rule === "number";
  }
  if (pattern === "string") {
    return typeof rule === "string";
  }
  if (pattern === "array") {
    // !logic test might be superfluous in JavaScript
    return Array.isArray(rule) && !jsonLogic.is_logic(rule);
  }

  if (jsonLogic.is_logic(pattern)) {
    if (jsonLogic.is_logic(rule)) {
      var pattern_op = jsonLogic.get_operator(pattern);
      var rule_op = jsonLogic.get_operator(rule);

      if (pattern_op === "@" || pattern_op === rule_op) {
        // echo "\nOperators match, go deeper\n";
        return jsonLogic.rule_like(
          jsonLogic.get_values(rule), // false),
          jsonLogic.get_values(pattern) //, false)
        );
      }
    }
    return false; // pattern is logic, rule isn't, can't be eq
  }

  if (Array.isArray(pattern)) {
    if (Array.isArray(rule)) {
      if (pattern.length !== rule.length) {
        return false;
      }
      /*
          Note, array order MATTERS, because we're using this array test logic to consider arguments, where order can matter. (e.g., + is commutative, but '-' or 'if' or 'var' are NOT)
        */
      for (var i = 0; i < pattern.length; i += 1) {
        // If any fail, we fail
        if (!jsonLogic.rule_like(rule[i], pattern[i])) {
          return false;
        }
      }
      return true; // If they *all* passed, we pass
    } else {
      return false; // Pattern is array, rule isn't
    }
  }

  // Not logic, not array, not a === match for rule.
  return false;
};

//return jsonLogic;
//}));/* globals define,module */

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///INIT OBJECT
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
boltObj.InitDB();
