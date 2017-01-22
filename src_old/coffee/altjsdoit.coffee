# http://altjsdoit.github.io/#zip=UEsDBAoAAAAIAA8KkUkXU5mClAIAAN4FAAAGAAAAc2NyaXB0fVRdb9MwFH3fr7jLJuaoxWMS4iFSYWgbggmBYOOFqprc1G28pXawnY1S9b9z%2FZVkYyIPre1z77nnftiH8PLtHsAhyQ4qZqosp2XF5IoD4fe5hwAWooQJbEsll2I1BlbbW%2BP%2FKruu%2FaI0ZocmZ96i1ZwueKkW%2FCMyIg%2B1TK%2B4pfesbnnuKV08U2rRWIyI58ST9tia6bu26TEXaeBpNzXvQYzeY0FlBC%2Bvvn6hxmohV2K5ISkD2daoOwPI8uCIgFE1yhaaYLbhcA%2B%2FsmbG9HnhefOwwExrVTIrlKSNVlaVqoYRHB0fH%2BFfB1XKWMnWfHjWKG0f7ZmtnA0S%2FxHNObPsx%2FdPyO9VxPIjgCeSP8Dl1U%2FRkKBuqTTc8c0YME9QS98kW3HpzOlS1JwkNIdEQ1dccs0sJ9jMdaO5MSiigOz84sPn99cX2c5xt%2FKxlDkz%2FM3r%2F6vZuoh%2BBlyYWrFFdBvDNiwKsLrlu2DuRs2N1O7ZVDyXR4LlFMFZpE6Z5ZSZa%2F7bkp4QF1y6sUPd31quN0%2Fq6GhG2SQbdVZnWAQlubTEl%2BmZks7orRKSZC8yFydM9ZD%2Bl1ukAH4TdVPT1MImR3%2ByZg0hLBm7b44ULFlOOkuUOp%2B%2Bmo1hTk0tSk5O8igDbWbRKKeaL1oEkRMth7TMu7uKdYL7TOfTk1kfiCU27JPvzWl%2Fc11%2Brq6JOtyevm1b7MduGMRXxbt0ukMksXS9exdjxYekuEnXMTwEYwiXHvfuejvm4SQSXCbdNzedFn%2FDG6YNJ%2FEwGWHQ%2Ff1k2SUce%2Bza%2Bw%2BWUkzzlgz8flCCAgaO%2FuEqYg6A7O5xSYh7toqY11MMX60CQq4wwE7DdKYGDObXvTwjyA4y%2FH086MS1ohi8IN4N%2B%2FkXUEsDBAoAAAAIAA8KkUmO6rRrpAAAADwBAAAGAAAAbWFya3VwbY5BDoIwEEX3noLUDWzaPUkXNXoED1BppYNAJ50hEU8vIKtiF7N4ee%2Bn1CRALik1WgRmpFop23NHLgLLFjhMDwlRcYDk0CaeVUcfwN%2BVA4yyI1GdYMSJS57Ra8H%2BzaIAtyxaCqLA3jY%2BxN75pMV5yfT9RteLicYYubwlx7pYK5u8LdeQtm9l6Q6P9mDTa8LM3uGfbZ57n09v7Og2cXxCm8k7rL5QSwMECgAAAAgADwqRSRPbMvkkAAAAJgAAAAUAAABzdHlsZStJrShJLEpN5FJQKM9MKclQMDEwKKgA8jJSM9MzSqwUjEB8AFBLAwQKAAAACAAPCpFJC0pJ1PIAAADHAQAABgAAAGNvbmZpZ2XQwU7DMAwG4FeZwnVIVFSI9bhqO0xMKipcuDmJ2wbSprJdRIV4d1KqIuhu0fc7juNPJa5FFmh7lSXpfbK7SXe75DZNtjERjypT4OWVbXCysSCwYfDvUCOp7ZzEijxUFWJpyPUycyOtj8EJLM5geCosZfQDR3EVQYtPYz89oH3Q0QR0ERtHuNLh4xqtk0CzH%2BZzpnh5AzvQHo%2BOUA%2F1g5N4rQLPuCQv2EtY2elxQBpVJjT82nNnkdgEWjfYg3nToVvzobzjxrUrLSgYZHZdvQryBuhnR%2F%2F0DNJcYDFczJAHi2dHNH3979D7uLAcTLPUf30DUEsBAhQACgAAAAgADwqRSRdTmYKUAgAA3gUAAAYAAAAAAAAAAAAAAAAAAAAAAHNjcmlwdFBLAQIUAAoAAAAIAA8KkUmO6rRrpAAAADwBAAAGAAAAAAAAAAAAAAAAALgCAABtYXJrdXBQSwECFAAKAAAACAAPCpFJE9sy%2BSQAAAAmAAAABQAAAAAAAAAAAAAAAACAAwAAc3R5bGVQSwECFAAKAAAACAAPCpFJC0pJ1PIAAADHAQAABgAAAAAAAAAAAAAAAADHAwAAY29uZmlnUEsFBgAAAAAEAAQAzwAAAN0EAAAAAA%3D%3D
$ ->
  $("#hash").change (ev)->
    dic = {config, altjs, althtml, altcss} = Configure.decodeHash(ev.target.value)
    $("#script").val(altjs)
    $("#markup").val(althtml)
    $("#style").val(altcss)
    $("#config").val(JSON.stringify(config, null, "  "))
    console.dir(dic)
    



class Configure
  pwd = location.protocol + '//' + location.hostname + location.port + location.pathname
  zipDataURI = (dic)->
    zip = new JSZip()
    for key, val of dic then zip.file(key, val) 
    zip.generate({compression: "DEFLATE"})
  unzipDataURI = (base64)->
    zip = new JSZip()
    {files} = zip.load(base64, {base64: true})
    hash = {}
    for key, val of files
      hash[key] = zip.file(key).asText()
    hash
  encodeURIQuery = (dic)->
    [key+"="+encodeURIComponent(val) for key, val of dic].join("&")
  decodeURIQuery = (query)->
    query
      .split("&")
      .map((a)->
        b = a.split("=")
        [b[0], b.slice(1).join("=")]
      ).reduce(((a, b)->
        a[b[0]] = decodeURIComponent(b[1])
        a
      ), {})
  @decodeHash = (hash)->
    config = {}
    {zip} = decodeURIQuery(hash.slice(1))
    if zip?
      {config:_config, script, markup, style} = unzipDataURI(zip)
      __config = JSON.parse(_config)
      if !!__config
        for key of __config
          config[key] = __config[key]
    config: config
    altjs: script or null
    althtml: markup or null
    altcss:  style  or null
  @encodeHash = (dic)->
    pwd + "#" + encodeURIQuery({zip: zipDataURI(dic)})
