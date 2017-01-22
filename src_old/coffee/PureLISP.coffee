#http://altjsdoit.github.io/#zip=UEsDBAoAAAAIAHUFkUlge1%2BWaAMAAAELAAAGAAAAc2NyaXB0pVZNT9wwEL3nV1jpJRFpgCuSqXqAY6kq1EsaIW%2FiZQNZO9he6Krqf69n%2FJFkdwtdyoHEM%2BN5b96MnU2S5OrLd5oQcnuR3qb2Kbr%2BIrX%2F4J0Zub7IuHguKlbnHy%2BtiZBuSdgnfDMrLkgFbjSSTmjDRMPlknxWim1dACYjvNecWIQad%2BLKrJR8sbbtwK%2BUkuqCMHW%2FWXNhNOm51sCAPwX8YjFnQJhoyeIvRDRZePDbAA0sjgRvmDpY%2FV6hOyRYdVa%2FCvXhF%2FsNJIU0pO%2B0QbD2vWDn7wCTQh8nLMYdpZ8eeNOxnjq4doQrmoOA%2BGgcLnoyBH5mfU3v7rh9YgaW57ZiH4X8Js5F7h3IceJo8teoL1iLHAn%2FOShLvpMCVGr5shP8X3Qi5CDXkY54tm2l1r4b%2FhYtx2GH2NNGGj6dFj8KkK1n60XLglPd6wL2zqhb4%2F5ZZb78UFC%2FbikmkQNX1qlDBvhreqk3itObxQNvTNkozgyH6DyGAEq5lOqKNSuSPfJt0dkMfmNl1zUNmauujtsqH1GQqZjRCAxHDHfko4zeYJm%2FKatTaSYrG4Z%2B60oGs6%2B3WnHWFsSwri%2FLsqboSlBHP%2BAYUYNsOI0zK2aDvcAZ6CSRJRZvpJoNDGzKQ59CxLRX1xvRGEvX1xsUJNQxXLOBZKjRpFkHR3Mu5DiYAXTe%2Btfvl7AnXjNLzzJNHOKoquNli4PFoasNNcRW4J7Y8Cge7LWnCYd67%2FaPnv0B%2BMaXXHELFmlDYKTszlmbJgNTmtOsE8PGOLZGPnKhKVowbamHvjNZmqV5%2BSA7kaUkI2k%2B8%2BWjL48%2Bo7p1Nos7%2FaFPTsGipDSZQyqqOk9gbbsaTJOJtAI4Y9lzcW9WUMFZUC6M5zhrd5MMNdXw8El9V2FHOWz0KhtnAtnczbAT3ErD3lepkCD6VxDTC74RNoG9LXhLrm6uSVxkxI44%2FNJIpxntJxSyWY1DafDt8uil7ruGZ%2Bc5SuX7DCliZRBMjxDvKMY5MEY5DlLOI%2BVqly4yqf%2B%2FP6jFTn%2Bg%2Fnl79uAjzzrx53I65mo7AlI8Bt6d%2BE8YtT8VJ5zsZZPtXDZvXjXhogmH44fAs9EwY78SXCmX3j5bSVzDgAFNQVK5MfH9ZdX13DsHJdeDyZy7SP1hC9GX6QmGnQDWiWPly7JxyR9QSwMECgAAAAgAdQWRST0Vsw4gAAAAJQAAAAYAAABtYXJrdXCzKVBIzkksLrZVz0jNyckvzy%2FKSVG3A7MVwBwb%2FQI7AFBLAwQKAAAACAB1BZFJVEM1ZB4AAAAcAAAABQAAAHN0eWxl08tIzcnJL88vyklRqFZIzs%2FJL7JSSC9KrLRWqAUAUEsDBAoAAAAIAHUFkUlpidxC6wAAALYBAAAGAAAAY29uZmlnZdDfS8MwEAfwf0Xi64TNSXF9XJmotFDpfPHtkl6baNqUyxUc4v9uulLR7C35fO%2Fy474Emw49QzeIdHN3v9mtt%2BvbbZLsViFhiyIV5Uh4lT9VpVgJsPzug2WuaRArRWbgmTV3NgSPxyKfQflzYVWFrWkIOjyehuk8aZ0MxiBLaCe4lu7zBmvDjmY%2FzOtU%2BOUC7EFafDCEcmxzw6GtAetxSd5wYBfZ88uIdBIp0%2Fhrr32N5JWj%2BIA9qA%2Fp%2BpgPVeK16SItySn03vRtFGQa6Dygf1oA6wucphp3uxoLQzR9%2Fe%2Bj92FgGSi91H%2F%2FAFBLAQIUAAoAAAAIAHUFkUlge1%2BWaAMAAAELAAAGAAAAAAAAAAAAAAAAAAAAAABzY3JpcHRQSwECFAAKAAAACAB1BZFJPRWzDiAAAAAlAAAABgAAAAAAAAAAAAAAAACMAwAAbWFya3VwUEsBAhQACgAAAAgAdQWRSVRDNWQeAAAAHAAAAAUAAAAAAAAAAAAAAAAA0AMAAHN0eWxlUEsBAhQACgAAAAgAdQWRSWmJ3ELrAAAAtgEAAAYAAAAAAAAAAAAAAAAAEQQAAGNvbmZpZ1BLBQYAAAAABAAEAM8AAAAgBQAAAAA%3D


ENV=
  T:"T"
  nil:"nil"
  atom:(env,[a])->
    if a?
    then [env, if a instanceof Array then "nil" else "T"]
    else throw "TypeError: arguments less"
  eq:(env,[a,b])->
    if a? and b?
    then [env, if a is b then "T" else "nil"]
    else throw "TypeError: arguments less"
  car:(env,[a])->
    if a instanceof Array
    then [env,a[0]]
    else throw "TypeError: #{a} is not list"
  cdr:(env,[a])->
    if a instanceof Array
    then [env,a[1]]
    else throw "TypeError: #{a} is not list"
  cons:(env,[a,b])->
    if a? and b?
    then [env,[a,b]]
    else throw "TypeError: arguments less"
special=
  cond:(env,[a,b,c])->
    if a? and b? and c?
      if ([env,val]=__eval(env,a))[1]
      then __eval(env,b)
      else __eval(env,c)
    else throw "TypeError: bad cond expression"
  define:(env,[a,b])->
    if a? and b?
      [env,val]=__eval(env,b)
      env[a]=val
      [env,val]
    else throw "TypeError: bad define expression"
  quote:(env,[a])-> [env,a]
  lambda:(env,[args,expr])->
    if args instanceof Array and expr?
      lmd=(env,operands)->
        closure=Object.create(env)
        args.forEach (key,i)->closure[key]=operands[i]
        [closure, val]=__eval(closure, expr)
        [env, val]
      [env,lmd]
    else throw "TypeError: bad lambda expression"
apply=(env,exprs)->
  [head, tail...]=exprs
  if special[head]?
  then special[head](env,tail)
  else
    [env,operator]=__eval(env,head)
    if operator instanceof Function
      operands = tail.map (expr)->
        [env,val]=__eval(env,expr)
        val
      operator(env,operands)
    else throw "TypeError: #{operator} is not function"
__eval=(env,expr)->
  if expr instanceof Array
  then apply(env, expr)
  else
    if env[expr]?
    then [env, env[expr]]
    else throw "ReferenceError: #{expr} is not defined"
parse=(input)->
  tokens=input
    .split("(").join(" ( ")
    .split(")").join(" ) ")
    .trim()
    .split(/\s+/)
  root(tokens,[])
root = (tokens,exprs)->
  if tokens.length is 0
  then exprs
  else
    [_tokens,expr]=sexpr(tokens)
    exprs.push(expr)
    root(_tokens,exprs)
sexpr=(tokens)->
  if tokens.length is 0
    throw "ParseError: unexpected EOF expected ( or atom"
  if tokens[0] is "("
  then list(tokens.slice(1),[])
  else atom(tokens)
list=(tokens,exprs)->
  if tokens.length is 0
    throw "ParseError: unexpected EOF expected ) or sexpr"
  if tokens[0] is ")"
  then [tokens.slice(1),exprs]
  else
    [_tokens,expr]=sexpr(tokens)
    exprs.push(expr)
    list(_tokens,exprs)
atom=(tokens)->
  [tokens.slice(1),tokens[0]]
_eval=(input)->
  try
    exprs=parse(input)
    env=ENV
    exprs.map((expr)->
      [env,val]=__eval(env,expr)
      val
    ).join("\n")
  catch err
    err
do ->
  input=""
  output=""
  while input=prompt(output,"")
    output=">"+input+"\n"+_eval(input)

  
