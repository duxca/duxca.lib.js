duxca.lib.Sandbox.readQRCode = ->
  $('<div id="reader" style="width:300px;height:250px"></div>')
  .appendTo("body")
  .html5_qrcode(
    ((data)-> console.log(data)),
    ((error)-> console.log(error)),
    ((videoError)-> console.log(videoError)))
