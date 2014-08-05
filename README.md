## amazono

[![Build](https://travis-ci.org/bandwidthcom/amazono.png)](https://travis-ci.org/bandwidthcom/amazono)
[![Dependencies](https://david-dm.org/bandwidthcom/amazono.png)](https://david-dm.org/bandwidthcom/amazono)

Amazon EC2 hosting provider for service_maker

## Install

```
npm install amazono
```
and then use this plugin from code like

```
yield server.register(require("amosono"));
```

or from  manifest file

```
"plugins":{
   "amazono": {}
}
```

Also you can use yeoman generator to install this plugin

```
yo co-hapi:add-plugin amazono
```

## Parameters

Credentials: accessKeyId*, secretAccessKey*.
Options: region*, imageId, keyName, instanceType, securityGroupIds, securityGroup.

Options with star (*) are required.

## Example

```
 $ sm_cli service-create host:amazono -c accessKeyId=id -c secretAccessKey=key -o region=us-west-1
```
