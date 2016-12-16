#https://altjsdoit.github.io/#zip=UEsDBAoAAAAIADkJkUmQ5gCRAwEAAJsCAAAGAAAAc2NyaXB0fZLNboQgFEb3PMXNXWlhpv510YV9EevCUVQmBAw4TR%2B%2FoNg0wY4JknznXLgEeq2slvzaS96ZJCV6MRZqaJAiw4sbL268Ykuajt1Yz4a2biqWsTf23hLD7UOum9%2BSQcPlgwCM2sCYg1C%2Fi7QuDXkR54GUZySw6pztVG97%2Bb7%2FgICKUxRg%2BQ8E4N%2BLcYfCBOmY045iilTnNPLCt3kFve1e8dwrab975XOvooP3Iuerk6417qbEt5lGwn4p3vGnoIA1ur%2FzI7MPdy%2F1FKoiRYzbhsJCnp20Gx7AdXnY%2BVjClRyx5GpaZ1%2BdkXXmCjrJzQqo9DoLNSHh0vIQHjV3LVSCnwrTH1BLAwQKAAAACAA5CZFJPRWzDiAAAAAlAAAABgAAAG1hcmt1cLMpUEjOSSwutlXPSM3JyS%2FPL8pJUbcDsxXAHBv9AjsAUEsDBAoAAAAIADkJkUlUQzVkHgAAABwAAAAFAAAAc3R5bGXTy0jNyckvzy%2FKSVGoVkjOz8kvslJIL0qstFaoBQBQSwMECgAAAAgAOQmRSVS8gbD9AAAAwQEAAAYAAABjb25maWdl0MFOhDAQBuB3qdc1AbMal6NkzcYsCYb14q0tA9QtlEwH48Z4ID6Aj%2BBBH8O34UUsS4ixe2u%2Ffzqd9pWRqsESr1sWhcvrcBUsL1dhcBEuXEIaWMSebRgM%2FffQfwz919B%2FDu8%2FbMG4pifr0tgUBUAmUbU0cUW1dsFml2wnkPZYmGVuqwrkNewO7dhZaCOcERcpL0c4E%2BblHHJFBidfT%2BuI2fkCaLjQcKsQRFduFbljBdcW5uQRWjKe3d13gAcPH5oc0EqDfocbLvfCND6vsytbqdrTFI0Ea1VTekFccTz%2B0D9NOFUnmHYnM8Qmh0Qhjm8n7P5mcz8Wc1nN9W%2B%2FUEsBAhQACgAAAAgAOQmRSZDmAJEDAQAAmwIAAAYAAAAAAAAAAAAAAAAAAAAAAHNjcmlwdFBLAQIUAAoAAAAIADkJkUk9FbMOIAAAACUAAAAGAAAAAAAAAAAAAAAAACcBAABtYXJrdXBQSwECFAAKAAAACAA5CZFJVEM1ZB4AAAAcAAAABQAAAAAAAAAAAAAAAABrAQAAc3R5bGVQSwECFAAKAAAACAA5CZFJVLyBsP0AAADBAQAABgAAAAAAAAAAAAAAAACsAQAAY29uZmlnUEsFBgAAAAAEAAQAzwAAAM0CAAAAAA%3D%3D
console.clear()
oprs = ["+","-","*","/"]
[a,b,c,d]=[4,0,5,9]
results = []
do ->
  for f1 in ["+","-"]
    for f2 in ["+","-"]
      for f3 in ["+","-"]
        for f4 in ["+","-"]
          for o1 in oprs
            for o2 in oprs
              for o3 in oprs
                expr = "("+f1+a+")"+o1+
                       "("+f2+b+")"+o2+
                       "("+f3+c+")"+o3+
                       "("+f4+d+")"
                val = eval(expr)
                result = expr + "=" + val
                console.log result
                if val is 10
                  results.push result
if results.length is 0
then alert "nothing"
else alert results.join("\n")