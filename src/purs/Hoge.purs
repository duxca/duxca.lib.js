-- | This module is Sandbox
-- | http://qiita.com/7shi/items/0ece8c3394e1328267ed#%E5%9E%82%E7%B7%9A%E3%81%AE%E4%BA%A4%E7%82%B9

module Hoge where

import Prelude
import Control.Monad.Eff.Console (print)
import Control.Monad.Eff
import Data.Foldable
import qualified Data.Char as Chr
import qualified Data.String as Str
import Data.Array
import Data.Maybe
import Data.Tuple
import Data.Tuple.Nested
import Math
import qualified Data.Sequence as Seq

-- | main
hoge:: forall a. Eff (console :: Control.Monad.Eff.Console.CONSOLE | a) Prelude.Unit
hoge = do
    print "Hello Pure!"  >>= \_ ->
      print "hello" >>= \_ ->
        print "world" >>= \_ ->
          print (show 0) >>= \_ ->
            bind (print $ show 1) \a ->
                print $ show a
    print "fin"

-- | using patern match
fib :: Int -> Int
fib 0 = 1
fib 1 = 1
fib n = fib (n - 1) + fib (n - 2)

-- | using guards
fib2 :: Int -> Int
fib2 n
  | n == 0 = 1
  | n == 1 = 1
  | true   = fib (n - 1) + fib (n - 2)

-- | using case of
fib3 n = case n of
    0        -> 1
    1        -> 1
    _ | true -> fib (n - 1) + fib (n - 2)

-- | usage:
-- | ```purescript
-- | > Hoge.sum' Prelude.$ Data.Array.range 1 10
-- | 55
-- | ```
sum' :: Array Int -> Int
sum' arr = case uncons arr of
  Just { head: x, tail: xs } -> x + sum' xs
  Nothing -> 0

-- | usage:
-- | ```purescript
-- | > Hoge.product' Prelude.$ Data.Array.range 1 10
-- | 3628800
-- | ```
product' :: Array Int -> Int
product' arr = case uncons arr of
  Just { head: x, tail: xs } -> x * product' xs
  Nothing -> 1

-- | usage:
-- | ```purescript
-- | > Hoge.take' 3 [1,2,3,4]
-- | [1,2,3]
-- | ```
take' :: Int -> Array Int -> Array Int
take' 0 arr = []
take' n arr = case uncons arr of
  Just { head: x, tail: xs } -> [x] ++ (take' (n-1) xs)
  Nothing -> []

-- | usage:
-- | ```purescript
-- | > Hoge.drop' 3 [1,2,3,4]
-- | [4]
-- | ```
drop' :: Int -> Array Int -> Array Int
drop' 0 arr = arr
drop' n arr = case uncons arr of
  Just { head: x, tail: xs } -> (drop' (n-1) xs)
  Nothing -> []

-- | usage:
-- | ```purescript
-- | > Hoge.reverse' [1,2,3,4]
-- | [4,3,2,1]
-- | ```
reverse' :: Array Int -> Array Int
reverse' arr = case uncons arr of
  Just { head: x, tail: xs } -> snoc (reverse' xs) x
  Nothing -> []

-- | usage:
-- | ```purescript
-- | > Hoge.fact 10
-- | 3628800
-- | ```
fact :: Int -> Int
fact n = product' $ range 1 n

-- | usage:
-- | ```purescript
-- | >  Hoge.perpPoint (Data.Tuple.Nested.tuple3 1.0 (-1.0) 0.0) $ Data.Tuple.Nested.tuple2 0.0 2.0
-- | Tuple (1.0) (1.0)
-- | ```
perpPoint :: Tuple3 Number Number Number -> Tuple2 Number Number -> Tuple2 Number Number
perpPoint tri dou =
  tuple2 x y
  where
    a = fst $ fst tri
    b = snd $ fst tri
    c = snd tri
    p = fst dou
    q = snd dou
    d = b*p - a*q
    y = (b*c - a*d)/(a*a + b*b)
    x = (a*c + b*d)/(a*a + b*b)

-- | ROT13
-- | usage:
-- | ```purescript
-- | > Hoge.rot13 "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
-- | "NOPQRSTUVWXYZABCDEFGHIJKLZnopqrstuvwxyzabcdefghijklm"
-- | ```
rot13 :: String -> String
rot13 "" = ""
rot13 str = case Str.uncons str of
  Just { head: chr, tail: _str } -> (Chr.toString $ rot13ch chr) ++ rot13 _str
  Nothing -> ""
  where
    rot13ch = \chr ->
      let n = (Chr.toCharCode chr)
      in case n of
          _ | 65  <= n && n < 78  -> Chr.fromCharCode (n + 13)
          _ | 78  <= n && n < 90  -> Chr.fromCharCode (n - 13)
          _ | 97  <= n && n < 110  -> Chr.fromCharCode (n + 13)
          _ | 110 <= n && n < 123 -> Chr.fromCharCode (n - 13)
          _ | true     -> chr


-- | gcd
-- | usage:
gcd n 0 = n
gcd 0 m = m
gcd n m = if n > m then gcd (n - m) m else gcd n (m - n)


-- | fin
