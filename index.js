"use strict";
let AWS = require("aws-sdk");
let _ = require("lodash");

function delay(ms){
  return function(callback){
    setTimeout(callback, ms);
  };
}


module.exports.register = function*(plugin){
  plugin.expose("type", "host");
  plugin.expose("parameters",{
    credentials: [{
      name: "accessKeyId",
      required: true
    }, {
      name: "secretAccessKey",
      required: true
    }, ],
    options: [{
      name: "region",
      required: true
    }, {
      name: "imageId",
      required: false
    }, {
      name: "keyName",
      required: false
    }, {
      name: "instanceType",
      required: false
    }, {
      name: "securityGroupIds",
      required: false
    }, {
      name: "securityGroups",
      required: false
    }]
  });
  plugin.expose("provision", function* (parameters) {
    let transformOptions = function(options) {
      if (!_.isObject(options)) {
          return options;
      }
      return _.transform(options || {}, function(res, val, key) {
        key = key[0].toUpperCase() + key.substr(1);
        if (Array.isArray(val)) {
            res[key] = val.map(function(i) {
                return transformOptions(i);
            });
        } else {
            res[key] = _.isObject(val) ? transformOptions(val) : val;
        }
      }, {});
    };
    let transformResult = function(result) {
      return _.transform(result || {}, function(res, val, key) {
        key = key[0].toLowerCase() + key.substr(1);
        if (Array.isArray(val)) {
            res[key] = val.map(function(i) {
                return transformResult(i);
            });
        } else {
            res[key] = _.isObject(val) ? transformResult(val) : val;
        }
      }, {});
    };
    let options = parameters.options || {};
    options.minCount = 1; //create only 1 instance
    options.maxCount = 1;
    if (!options.region) {
      throw new Error("Missing required option \"region\"");
    }
    if (!options.instanceType) {
      options.instanceType = "t1.micro";
    }
    if (!options.imageId) {
      options.imageId = "ami-68c2a858"; //ubuntu-trusty-14.04-i386-server
    }
    options = transformOptions(options);
    let ec2 = new AWS.EC2(parameters.credentials || {});
    let data = transformResult(yield ec2.runInstances.bind(ec2, options));
    let instance = data.instances[0];

    var start = new Date();
    yield delay(5000);
    let statusOptions = transformOptions({
        instanceIds: [instance.instanceId]
    });
    while (true) {
      let r = transformResult(yield ec2.describeInstanceStatus.bind(ec2, statusOptions));
      if (Number(r.instanceStatuses[0].instanceState.code || 0) > 0) {
        break;
      }
      else {
        if ((new Date() - start) >= 600000) { // wait max 10 minutes
          throw new Error("Timeout");
        }
        yield delay(15000);
      }
    }
    return {
      id: instance.instanceId,
      ip: instance.publicIpAddress
    };
  });
};

module.exports.register.attributes = {
  pkg: require("./package.json")
};
