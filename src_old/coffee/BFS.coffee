# http://altjsdoit.github.io/#zip=UEsDBAoAAAAIAPAJkUkbsL2f%2FwAAADUCAAAGAAAAc2NyaXB0hVFNa8QgEL3nV7yjAStJP2h76EJ76B%2FoUSQEO7sbsAmoC%2B2%2F76iJZE8riMO8NzNvntET4Q1a9xL6AVI%2FGg70k8QLB8987%2Fkm8NUk5CbtNqPvTTrNx%2BcXTxaRFbR3hwbwZC9%2BS0n8jL8S1oYCAnoYhpzjl9OGmYmoPH1fLAkh9AonUMLReNxKgemIeYl49378U1PIr8iUlZApqQEOubSm45lm7FtXhFwg6ES%2BRlK%2BknaVyi6zHaMQdY%2ByXVlcrI32WFtatuza5oYpgpPYzFGO5lM8Ywromqq3WNVUlYWrOyOuTVTBTexd37ab%2F6v5HY%2FkUaw4LI6UW07g%2Fyqf1fwDUEsDBAoAAAAIAPAJkUl4U9b5JAAAACYAAAAGAAAAbWFya3VwsylQSM5JLC62Vc9IzcnJL8%2FPKUpRtwOzFcrzi3JSFG30C%2BwAUEsDBAoAAAAIAPAJkUm6EMeYHQAAABsAAAAFAAAAc3R5bGXTy0jNyckvz88pSlGoVkjOz8kvslIoSk2xVqgFAFBLAwQKAAAACADwCZFJPbNOC%2F0AAADAAQAABgAAAGNvbmZpZ2XQsU7DMBAG4Hcxa5GoGkGbkagMFZWCAgvbObkkBieOzheJCLFRiYmH6MjMwgMFXgOnUYRwN%2Bv7z%2BfzPQtWFVqGqhHhPFjOV2fBarFYBhczl7BGEYr%2Ba9e%2FfvS7t%2B%2F3%2Fc%2FnXswEaH6wLolMniMmKamGRy650i7YQIYjpHYoTLjTrXWicoIKb7tmaCy1kc4YZAzFACfSPJ1iptjQ6OvxHAo7vYE1SI1XilC2xbVidy0HbXFK7rFh49nmpkXqPLyrMySbGvI7XEL6KE3t8zo5t6WqPI3JpGitqgsviEqgw5L%2B6Ra4PMK4PZohMhluFdHwd6b2bza3sQjScqp%2F%2BQVQSwECFAAKAAAACADwCZFJG7C9n%2F8AAAA1AgAABgAAAAAAAAAAAAAAAAAAAAAAc2NyaXB0UEsBAhQACgAAAAgA8AmRSXhT1vkkAAAAJgAAAAYAAAAAAAAAAAAAAAAAIwEAAG1hcmt1cFBLAQIUAAoAAAAIAPAJkUm6EMeYHQAAABsAAAAFAAAAAAAAAAAAAAAAAGsBAABzdHlsZVBLAQIUAAoAAAAIAPAJkUk9s04L%2FQAAAMABAAAGAAAAAAAAAAAAAAAAAKsBAABjb25maWdQSwUGAAAAAAQABADPAAAAzAIAAAAA
tree = [[1, [3 ,[4], [[5, 8], 7], 2], 1, [9]], [1, [3 ,[4], [[5, 8], 7], 2], 1, [[1, [3 ,[4], [[5, 8], 7], 2], 1, [11]]]]]
BFS = (tree)->
  recur = (tree, max, ccs)->
    [___max, ___ccs] = tree.reduce((([_max, _ccs], leaf)->
      if not Array.isArray(leaf)
        if _max > leaf
        then [_max, _ccs]
        else [leaf, _ccs]
      else
        [_max, _ccs.concat((__max, __ccs)-> recur(leaf, __max, __ccs))]
    ), [max, ccs])
    if ___ccs.length is 0
    then ___max
    else ___ccs[0](___max, ___ccs.slice(1))
  recur(tree, 0, [])
console.log BFS(tree)
