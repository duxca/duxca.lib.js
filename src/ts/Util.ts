module duxca.lib.Util {

  export function importObject(hash: {[key:string]: any}): void{
    new Function("hash", "Object.keys(hash).forEach(function(key){self[key]=hash[key];});").call(self, hash);
    console.log("some global variables appended: ", Object.keys(hash));
  }
}
