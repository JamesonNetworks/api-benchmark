var apiBenchmark = require('./../../index');
var should = require('should');
var TestServers = require('http-test-servers');

describe('measure function', function(){

  var testServers,
      server = { "My api": { port: 3006, delay: 0 },
                 "My slow api": { port: 3007, delay: 100 }},
      serversToBenchmark = { "My api": "http://localhost:3006/"},
      slowServersToBenchmark = { "My api": "http://localhost:3007/"},
      endpoints = { 
        simpleRoute: '/getJson', 
        secondaryRoute: '/getJson2',
        postRoute: {
          route: '/postJson',
          method: 'post',
          data: {
            test: true,
            someData: 'someStrings'
          }
        },
        deleteRoute: {
          route: '/deleteMe?test=true',
          method: 'delete'
        },
        errorRoute: {
          route: '/errorRoute',
          method: 'get',
          statusCode: 403
        }
      };

  before(function(done){
    
    var serversToStart = new TestServers(endpoints, server);
    serversToStart.start(function(httpTestServers){
      testServers = httpTestServers;
      done();
    });
  });

  after(function(done){
    testServers.kill(done);
  });

  it('should correctly measure the performances of the service', function(done) {
    apiBenchmark.measure(serversToBenchmark, { simpleRoute: endpoints.simpleRoute, postRoute: endpoints.postRoute }, function(err, results){
      results['My api'].should.not.be.eql(null);
      done();
    });
  });

  it('should correctly perform the minimum number of samples if we set minSamples and maxTime in runMode=sequence', function(done) {
    apiBenchmark.measure(serversToBenchmark, { simpleRoute: endpoints.simpleRoute}, { minSamples: 15, maxTime: 10, runMode: 'sequence' }, function(err, results){
      results['My api'].simpleRoute.stats.sample.length.should.be.eql(15);
      done();
    });
  });

  it('should correctly perform parallel requests to the service with runMode=parallel', function(done) {

    var parallelRequests = 50;

    apiBenchmark.measure(serversToBenchmark, { simpleRoute: endpoints.simpleRoute }, { runMode: 'parallel', minSamples: parallelRequests }, function(err, results){
      results['My api'].should.not.be.eql(null);
      results['My api'].simpleRoute.stats.sample.length.should.be.eql(parallelRequests);
      done();
    });
  });

  it('should correctly display hrefs and concurrencyLevel for each result', function(done) {
    apiBenchmark.measure(serversToBenchmark, { simpleRoute: endpoints.simpleRoute }, { runMode: 'parallel', maxConcurrentRequests: 10 }, function(err, results){
      results['My api'].simpleRoute.href.should.be.eql("http://localhost:3006/getJson");
      results['My api'].simpleRoute.options.concurrencyLevel.should.be.eql(10);
      done();
    });
  });

  it('should correctly raise an exception if the optional expectedStatusCode is specified and incorrect', function(done) {

    var routesToBenchmark = {
      simpleRoute: {
        route: "/getJson",
        expectedStatusCode: 200
      },
      errorRoute: {
        route: "/errorRoute",
        expectedStatusCode: 200
      }
    };

    apiBenchmark.measure(serversToBenchmark, routesToBenchmark, function(err, results){
      err.should.be.eql("Expected Status code was 200 but I got a 403 for My api/errorRoute");
      should.not.exist(results);
      done();
    });
  });

  it('should correctly raise an exception if the optional maxMean is specified and out of range', function(done) {

    var routesToBenchmark = {
      simpleRoute: {
        route: "/getJson",
        maxMean: 0.080
      }
    };

    apiBenchmark.measure(slowServersToBenchmark, routesToBenchmark, { minSamples: 2 }, function(err, results){
      err.should.be.eql("Mean should be below 0.08");
      should.not.exist(results);
      done();
    });
  });

  it('should just collect the results including the errors in case of error and option stopOnError=false', function(done) {

    var routesToBenchmark = {
      simpleRoute: {
        route: "/getJson",
        maxMean: 0.08
      },
      errorRoute: {
        route: "/errorRoute",
        expectedStatusCode: 200
      }
    };

    apiBenchmark.measure(slowServersToBenchmark, routesToBenchmark, { stopOnError: false, minSamples: 2 }, function(err, results){
      results['My api'].should.not.be.eql(null);
      results['My api'].simpleRoute.errors['maxMeanExceeded'].length.should.be.above(0);
      results['My api'].errorRoute.errors['httpStatusCodeNotMatching'].length.should.be.above(0);

      err['My api'].simpleRoute.should.be.eql(results['My api'].simpleRoute.errors);
      err['My api'].errorRoute.should.be.eql(results['My api'].errorRoute.errors);
      done();
    });

  });

  it('should work without the optional options parameter', function(done) {
    apiBenchmark.measure(serversToBenchmark, { simpleRoute: endpoints.simpleRoute }, function(err, results){
      results['My api'].should.not.be.eql(null);
      done();
    });
  });

  it('should correctly handle post routes', function(done) {
    apiBenchmark.measure(serversToBenchmark, { postRoute: endpoints.postRoute }, function(err, results){
      results['My api'].postRoute.should.not.be.eql(null);
      done();
    });
  });

  it('should correctly handle delete routes', function(done) {
    apiBenchmark.measure(serversToBenchmark, { deleteRoute: endpoints.deleteRoute }, function(err, results){
      results['My api'].deleteRoute.should.not.be.eql(null);
      done();
    });
  });
});