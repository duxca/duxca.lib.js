module.exports =
  lib:
    Sandbox: [
      require("./Sandbox")
    ].reduce((merged, obj)->
      Object.keys(obj).forEach (key)->
        merged[key] = obj[key]
      merged
    , {})
