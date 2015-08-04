## Module Hoge

This module is Sandbox
http://qiita.com/7shi/items/0ece8c3394e1328267ed#%E5%9E%82%E7%B7%9A%E3%81%AE%E4%BA%A4%E7%82%B9

#### `hoge`

``` purescript
hoge :: forall a. Eff (console :: CONSOLE | a) Unit
```

main

#### `fib`

``` purescript
fib :: Int -> Int
```

using patern match

#### `fib2`

``` purescript
fib2 :: Int -> Int
```

using guards

#### `sum'`

``` purescript
sum' :: Array Int -> Int
```

usage:
```purescript
> Hoge.sum' Prelude.$ Data.Array.range 1 10
55
```

#### `product'`

``` purescript
product' :: Array Int -> Int
```

usage:
```purescript
> Hoge.product' Prelude.$ Data.Array.range 1 10
3628800
```

#### `take'`

``` purescript
take' :: Int -> Array Int -> Array Int
```

usage:
```purescript
> Hoge.take' 3 [1,2,3,4]
[1,2,3]
```

#### `drop'`

``` purescript
drop' :: Int -> Array Int -> Array Int
```

usage:
```purescript
> Hoge.drop' 3 [1,2,3,4]
[4]
```

#### `reverse'`

``` purescript
reverse' :: Array Int -> Array Int
```

usage:
```purescript
> Hoge.reverse' [1,2,3,4]
[4,3,2,1]
```

#### `fact`

``` purescript
fact :: Int -> Int
```

usage:
```purescript
> Hoge.fact 10
3628800
```

#### `perpPoint`

``` purescript
perpPoint :: Tuple3 Number Number Number -> Tuple2 Number Number -> Tuple2 Number Number
```

usage:
```purescript
>  Hoge.perpPoint (Data.Tuple.Nested.tuple3 1.0 (-1.0) 0.0) $ Data.Tuple.Nested.tuple2 0.0 2.0
Tuple (1.0) (1.0)
```

#### `rot13`

``` purescript
rot13 :: String -> String
```

ROT13
usage:
```purescript
> Hoge.rot13 "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
"NOPQRSTUVWXYZABCDEFGHIJKLZnopqrstuvwxyzabcdefghijklm"
```

#### `bsort`

``` purescript
bsort :: Array Number -> Array Number
```

bubble sort
```purescript
> Hoge.bsort [5.0,1.0,3.0,2.0,4.0,0.0]
[0.0,1.0,2.0,3.0,4.0,5.0]
```

#### `bswap`

``` purescript
bswap :: Array Number -> Array Number
```

```purescript
Hoge.bswap [5.0,1.0,3.0,2.0,4.0,0.0]
[0.0,5.0,1.0,3.0,2.0,4.0]
```


