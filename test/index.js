"use strict";
let plugin = require("..");
let helper = require("./hostHelper");
let AWS = require("aws-sdk");
let _ = require("lodash");
let sinon = require("sinon");
let Hapi = require("co-hapi");

describe("The Amazon EC2 service provider", function() {
  let server, provider;
  before(function*(){
    server = new Hapi.Server("localhost", 3001);
    yield server.pack.register(plugin);
    provider = server.plugins[require("../package.json").name];
  });

  it("provides metadata about the service", function() {
    provider.type.should.equal("host");
  });

  describe("provisioning an EC2 instance", function() {
    let runner, creationOptions, statusOptions, startTime, credentials, timeToCreateInstance, stub;
    beforeEach(function * () {
      runner = helper.createRunner();
      let transformOptions = function(options) {
        if (!_.isObject(options)) {
          return options;
        }
        return _.transform(options || {}, function(res, val, key) {
          key = key[0].toLowerCase() + key.substr(1);
          if (Array.isArray(val)) {
            res[key] = val.map(function(i) {
              return transformOptions(i);
            });
          }
          else {
            res[key] = _.isObject(val) ? transformOptions(val) : val;
          }
        }, {});
      };
      let fakeEC2 = {
        runInstances: function(options, callback) {
          options = transformOptions(options);
          options.should.eql(creationOptions);
          startTime = Date.now();
          return callback(null, {
            "Instances": [{
              "InstanceId": "id",
              "PublicIpAddress": "ip"
            }]
          });
        },
        describeInstanceStatus: function(options, callback) {
          let code = 0;
          transformOptions(options).should.eql(statusOptions);
          if (Date.now() - startTime > timeToCreateInstance) {
            code = 16;
          }
          return callback(null, {
            "InstanceStatuses": [{
              "InstanceId": "id",
              "InstanceState": {
                  "code": code
              }
            }]
          });
        }
      };

      credentials = {
        accessKeyId: "accessKeyId",
        secretAccessKey: "secretAccessKey"
      };

      stub = sinon.stub(AWS, "EC2");
      stub.withArgs(credentials).returns(fakeEC2);

      creationOptions = {
        imageId: "ami-1e3a502e",
        instanceType: "t1.micro",
        region: "region"
      };
      statusOptions = {
        instanceIds: ["id"]
      };
    });

    afterEach(function * () {
      runner.free();
      stub.restore();
    });

    it("creates new EC2 instance", function * () {
      timeToCreateInstance = 10000;
      yield runner.runJob(5000, function * () {
        let result = yield provider.provision({
          credentials: credentials,
          options: creationOptions
        });
        result.id.should.equal("id");
        result.ip.should.equal("ip");
      });
    });

    it("throws timeout error if creating of EC2 instance has not completed in 10 minutes", function * () {
      timeToCreateInstance = 700000; // a bit more than 10 minutes
      yield runner.runJob(60000, function * () {
        try {
          yield provider.provision({
              credentials: credentials,
              options: creationOptions
          });
          throw new Error("It should throw timeout error");
        }
        catch (err) {
          err.message.should.equal("Timeout");
        }
      });
    });
  });
});
