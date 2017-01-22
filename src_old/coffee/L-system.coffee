#http://altjsdoit.github.io/#zip=UEsDBAoAAAAIAKgJkUn6L7cpEQMAAE0IAAAGAAAAc2NyaXB0nVZta9swEP7uXyH8ya5f6nTrGBspjEKgsI2y9sOKMcO1lVjUljxLbrqV%2FvfdSbLrOGkpawhId889utM9urTJGSdLEp05hBSipLB2Vy5sur6mEnYprAlJwRiCJw1WEXyyVRpFqwA%2BmZsBAL%2Bq71RNfxwIe3QL0TQ5L91PxF2Lbpt3JbLl3UaCKV0kGXnKbEAwDwBeDjb4ew44zUZ89AZ8NA1I5wFtL6tZwDM620OL1oDnaPyKVkHtjzrWrWheloxvABJ9y1UVX14cnxjXXyEaMNudbClF7kVi9mK9llT9BMuO4QYM75JkIGebSoHlg7Y8jQ3w%2BJWi7derP1LRxsOWhqaXIXnnh9MuhZhuCK33HcfiIflpiK9l0VHZ11iXi7rYVqymWipxTflGVeTMpon1AgpdaWLuzypKo2XNCuotfO34hfzg0cfEa1Yr2hEPd3CmtgIFYVKT6gi2NkHzU1VF%2BZBisDQYiE0XJgNaSzpxWzpjcJzpXc1qDwkYW3MDpmbcR9G0rgO37Nt35DjmpvdY9Z0XeV3f5sWdoS%2F4fbxlJRS1RLddi468TxJi%2FabfFmA3BoEA9YC3DLANVeeCK%2FqgPPekdDGbQYZjrN1CNMaiFK1LL8F8CmatSWs3a%2Buw4rSuYWfJrFB3nDeD877A%2FNOx2uOTwIaHkxJH6w02UCq4JYzSmzvWnoueIw0SmsrjRtzTa%2BEBPfQ9xGOg%2BVh5KaDRRd8N802L6JByD2r3FfX%2Bj35fVrA5Sg8YsiPg2FpHFA6cGQRNo19umSoqMg9DAcMjGUfvxKG7gqnC29AzqhDSGyTiH33vm1vaeXgIgPwjVMhe9OI5WjL%2B9miTlB7X5hWP0hzoLi%2FmHMeLj8kehR7ghkLrJUYDTO1WSKaY4DAlIU%2FbQpiB08k8LJ%2F2WWHQ79Q6JQS%2BF3igPzYJ0Xr%2BDsGrYh0ANeOvA6TqxB0dqUFV47sIAhCVfq3Wae5kcC%2BTz%2FAgfvdUqi%2BcNTmWsuryhnr6mQyMdmSCxR6iDfAir1lDRa%2B8YXqF8IuVJPDr4TTwXwSA%2FwFQSwMECgAAAAgAqAmRSRO0Tx8MAAAACgAAAAYAAABtYXJrdXBLTswrSyxWTs4rAwBQSwMECgAAAAgAqAmRSVRDNWQeAAAAHAAAAAUAAABzdHlsZdPLSM3JyS%2FPL8pJUahWSM7PyS%2ByUkgvSqy0VqgFAFBLAwQKAAAACACoCZFJMlIFcPgAAADGAQAABgAAAGNvbmZpZ2XQwU7DMAwG4HcJ101i0xisR6pxmDqpqOPCzUndNpA0leNKVIjDngbeay9CumpCZLfk%2Bx3HyadgbdEz2E4ki9XDYnO7ut%2Bs75bLWUjYoEhENi8Gz2hPx59DT8FOx%2B8MoRIzAYbffChJXVUhFop0xxM3bE0IdlDiBMqfC4sibHVFYPEwdGN7aZwMxiBzqEe4ke5jjqVmR5Nvp3Ui%2FOUCbEEafNKEsq8zzeFYBcbjJXnFjl1ku%2BceaYjwpS2RvHIUd3gE9S5dG%2FO2WPtG20hzcgq9120dBWkDdP6hf7oHbq4w769mSF2Je000vp2p%2F5st%2FFgKqrnUf%2F0CUEsBAhQACgAAAAgAqAmRSfovtykRAwAATQgAAAYAAAAAAAAAAAAAAAAAAAAAAHNjcmlwdFBLAQIUAAoAAAAIAKgJkUkTtE8fDAAAAAoAAAAGAAAAAAAAAAAAAAAAADUDAABtYXJrdXBQSwECFAAKAAAACACoCZFJVEM1ZB4AAAAcAAAABQAAAAAAAAAAAAAAAABlAwAAc3R5bGVQSwECFAAKAAAACACoCZFJMlIFcPgAAADGAQAABgAAAAAAAAAAAAAAAACmAwAAY29uZmlnUEsFBgAAAAAEAAQAzwAAAMIEAAAAAA%3D%3D
main = ->
  code = "F"
  rules = [
    ["F", "F[+F-F-F]F[--F+F+F]"]
  ]
  turtleRules = [
    ["F", {"command": "forward", "args": [10] }]
    ["+", {"command": "turn",    "args": [15]}]
    ["-", {"command": "turn",    "args": [-15]}]
    ["[", {"command": "push",    "args": []}]
    ["]", {"command": "pop",     "args": []}]
  ]
  opt = {
    "headding": -Math.PI/2
    "zoom": 2
    "speed": 10
    "offsetX": 0
    "offsetY": 300
    "height": 600
  }
  turtle(nStepLSystem(code, rules, 3), turtleRules, opt, ->)

LSystem = (code, rules)->
  result = ""
  while code.length > 0
    head = code[0]
    code = code.slice(1)
    _rule = rules.filter (rule)-> rule[0] is head
    if _rule.length > 0
    then result += _rule[0][1]
    else result += head
  result

nStepLSystem = (code, rules, step)->
  while step--
    code = LSystem(code, rules)
  code

turtle = (code, rules, opt, callback)->
  cnv.width = opt.width or 400 
  cnv.height = opt.height or 400
  ctx = cnv.getContext("2d")
  headding = opt.headding or 0
  zoom = opt.zoom or 5
  speed = opt.speed or 5
  offsetX = opt.offsetX or 0
  offsetY = opt.offsetY or 0
  vct = [cnv.width/2+offsetX, cnv.height/2+offsetY]
  stack = []
  skipCount = 0
  
  ctx.moveTo(vct[0], vct[1])
  do recur = ->
    if code.length > 0
      head = code[0]
      code = code.slice(1)
      _rule = rules.filter (rule)-> rule[0] is head
      if _rule.length > 0
        command = _rule[0][1].command
        args = _rule[0][1].args
        switch command
          when "forward"
            vct[0] += Math.cos(headding)*Number(args[0])*zoom
            vct[1] += Math.sin(headding)*Number(args[0])*zoom
          when "turn" then headding += Math.PI*Number(args[0])/180
          when "push" then stack.push {"position": vct.slice(), "headding": headding}
          when "pop"
            {"position":vct, "headding": headding} = stack.pop()
            ctx.moveTo(vct[0], vct[1])
      ctx.lineTo(vct[0], vct[1])
      ctx.stroke()
      if skipCount++ > speed
      then skipCount=0; requestAnimationFrame(recur)
      else recur()
    else setTimeout(callback, 1000)


main()
