// http://altjsdoit.github.io/#zip=UEsDBAoAAAAIANUGkUnBwD78egEAANECAAAGAAAAc2NyaXB0bVFBTsMwELzzCpNLbRoZuFL1whEBRSDEIfhg0nVxG%2BzI3jRUVf7Opk5pi7AUKZ6d2RnvmsaVaL1jxnGxPWMsADbBsULJ0rtSIyeMsdnHEkqUK9hEjp82ivwYXgDOWvcUfA0BN4%2F6C05Y3AwmyaE%2Fax3IKTYVxmmhJgNqfOB9hWyYdWzXYq9ge76sm%2FjJiSL2sm7IPBAS3AlZ6qpKOQgRMsC8KeEQBusq79skB2v4%2BTlBxZUqCFViaEpQanhUm2Jo4IBeq7%2BZTrVdXmzpU0r01OgDciGX3jo%2BencjknRnNOvoK5CVX%2FBsSoe11s19y%2Fr%2FTJzUjTt6GalbH1YQ2JQ5aNnb7tIv7fX5XpYBNELaEt3TLnvabeU%2F%2BDC%2BIotQGVn7iA8Qo14Av3uZPcqIwbqFNRvOs7Fx4%2Bx4onkxuhgpss9UPvTZ4qaGmwzhGy%2BXeq1jGWyNWScOIaV3X8mC4v4uAta7Hfwzg%2BFlaQanjF3EWocIpJdzjbq36SY%2FUEsDBAoAAAAIANUGkUk9FbMOIAAAACUAAAAGAAAAbWFya3VwsylQSM5JLC62Vc9IzcnJL88vyklRtwOzFcAcG%2F0COwBQSwMECgAAAAgA1QaRSVRDNWQeAAAAHAAAAAUAAABzdHlsZdPLSM3JyS%2FPL8pJUahWSM7PyS%2ByUkgvSqy0VqgFAFBLAwQKAAAACADVBpFJk7y6yh0BAADcAQAABgAAAGNvbmZpZ2XQwUrDQBAG4HdZrxVaLbXmaKhIaSGSSsHbbDJt1ibZMLtRiwgmJ8Grd2%2BtIHj2fVbQx3BjrND0tvv9O%2BzM3DEtElQakow5nW6%2Fc9w%2B7PUPjtrdlk10jMxhU5GG8sYUr1NJCyRTvOtIKFO8fT2%2FmOLRFCtTPpmytMHnx8P3as1aDGJ9pWztEK7BD0hkusZIJ7Hls8l4VEOgqmeu79urmBEkOFlm1a88ltyaBu7BvII9Lm%2F3MRRaUu2D%2BuwwtfkAU%2BAxngpCns9HQtsyTTlugkvMtGTODGL1b8PzHGnZwIs0RFKBJGwEJxAsuEybPPB7KhJJQz2SASol0nkjcCOg3%2FVs6Rh0tINevtODK0McC6Jq9O3m7MZcCKK%2Fqe9%2FAFBLAQIUAAoAAAAIANUGkUnBwD78egEAANECAAAGAAAAAAAAAAAAAAAAAAAAAABzY3JpcHRQSwECFAAKAAAACADVBpFJPRWzDiAAAAAlAAAABgAAAAAAAAAAAAAAAACeAQAAbWFya3VwUEsBAhQACgAAAAgA1QaRSVRDNWQeAAAAHAAAAAUAAAAAAAAAAAAAAAAA4gEAAHN0eWxlUEsBAhQACgAAAAgA1QaRSZO8usodAQAA3AEAAAYAAAAAAAAAAAAAAAAAIwIAAGNvbmZpZ1BLBQYAAAAABAAEAM8AAABkAwAAAAA%3D
function fn(){
  return [].concat(
    Object.keys(this),
    Object.getOwnPropertyNames(this),
    (function(){
      var results=[];
      for(var key in this){
        results.push(key);
      }return results;
    }).call(this)
  ).reduce(function(tpl,key){
    if(!!tpl[0][key])return tpl;
    tpl[0][key]=true;
    tpl[1].push(key);
    return tpl;
  },[{},[]])[1].sort().join('\n');
}
console.log("==== window ====")
console.log(fn.call(this));
worker = new Worker(
  URL.createObjectURL(
    new Blob(
      ["self.postMessage(JSON.stringify(("+fn+").call(this),['*']));"],
      {type:"text/javascript"})));
worker.onmessage = function(ev){
  console.log("==== worker ====")
  console.log(JSON.parse(ev.data));
};