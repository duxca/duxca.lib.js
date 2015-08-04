-- | This module is Sandbox
-- | http://qiita.com/7shi/items/0ece8c3394e1328267ed#%E5%9E%82%E7%B7%9A%E3%81%AE%E4%BA%A4%E7%82%B9

module Hoge where

import Prelude
import Control.Monad.Eff
import Control.Monad.Eff.Console

-- | main
main:: forall a. Eff (console :: CONSOLE | a) Unit
main = do
  print "Hello Pure!"  >>= \_ ->
    print "hello" >>= \_ ->
      print "world" >>= \_ ->
        print (show 0) >>= \_ ->
          bind (print $ show 1) \a ->
              print $ show a
  print "fin"

-- | read example
-- (read (toForeign 0)) ::Data.Foreign.F Int

data Color = Blue | Red | Green | White deriving (Show)

main2 = do
    print $ fromEnum Blue
    print $ fromEnum Red
    print $ fromEnum Green
    print $ fromEnum White
    print (toEnum 0 :: Color)
    print (toEnum 1 :: Color)
    print (toEnum 2 :: Color)
    print (toEnum 3 :: Color)

module Huga where

import Prelude
import Control.Monad.Eff.Console (CONSOLE())
import Control.Monad.Aff
import Control.Monad.Aff.Console(print)

type Test a = forall e. Aff (console :: CONSOLE | e) a

test_sequencing :: forall e. Int -> Aff (console :: CONSOLE | e) _
--test_sequencing :: forall e. Int -> Aff (console :: CONSOLE | e) _
test_sequencing 0 = print "Done"
test_sequencing n = do
  later' 100 (print (show (n / 10) ++ " seconds left"))
  test_sequencing (n - 1)

module Q1 where

import Prelude
import Control.Monad.Eff
import Control.Monad.Eff.Console

-- | using patern match
fib :: Int -> Int
fib n
  | n == 0 = 1
  | n == 1 = 1
  | n >  1 = fib (n - 2) + fib (n - 1)

-- | using guards
fib2 :: Int -> Int
fib2 n
  | n == 0 = 1
  | n == 1 = 1
  | n >  1 = fib2 (n - 2) + fib2 (n - 1)

-- | using case of
fib3 :: Int -> Int
fib3 n = case n of
    0 -> 1
    1 -> 1
    _ | n > 1 -> fib3 (n - 2) + fib3 (n - 1)

-- | > Q1.main
-- | 89
-- | 89
-- | 89
-- | unit
main:: forall a. Eff (console :: CONSOLE | a) Unit
main = do
  print $ fib 10
  print $ fib2 10
  print $ fib3 10


module Q2 where

import Prelude hiding (map, append)
import Control.Monad.Eff
import Control.Monad.Eff.Console
import Data.Foldable
import Data.Array (range)
import qualified Data.Sequence as S
import Data.Maybe
import Data.Int
import Data.Tuple
import qualified Data.List as L

sum' :: forall a. (Ring a)=> S.Seq a -> a
sum' arr = case S.uncons arr of
  Just tpl ->
    let x = fst tpl
        xs = snd tpl in
      x + sum' xs
  Nothing -> zero

product' :: forall a. (Ring a)=> L.List a -> a
product' arr = case L.uncons arr of
  Just { head: x, tail: xs } -> x * product' xs
  Nothing -> one

main:: forall a. Eff (console :: CONSOLE | a) Unit
main = do
  print $ show $ sum' $ S.toSeq [1,2]
  print $ product' $ L.toList $ range 1 5


{-
take' :: forall a. Int -> Array a -> Array a
take' 0 arr = []
take' n arr = case uncons arr of
  Just { head: x, tail: xs } -> x : take' (n - 1) xs
  Nothing -> []

drop' :: forall a. Int -> Array a -> Array a
drop' 0 arr = arr
drop' n arr = case uncons arr of
  Just { head: x, tail: xs } -> drop' (n - 1) xs
  Nothing -> []

reverse' :: forall a. Array a -> Array a
reverse' arr = case uncons arr of
  Just { head: x, tail: xs } -> (reverse' xs) `snoc` x
  Nothing -> []

-- | > Q2.main
-- | 15
-- | 120
-- | [3]
-- | [1,2]
-- | [5,4,3,2,1]
-- | unit
main:: forall a. Eff (console :: CONSOLE | a) Unit
main = do
  print $ show $ sum' $ range 1 5
  print $ product' $ range 1 5
  print $ drop' 2 [1, 2, 3]
  print $ take' 2 [1, 2, 3]
  print $ reverse' $ range 1 5
-}

module Q3 where

import Prelude
import Control.Monad.Eff
import Control.Monad.Eff.Console
import Data.Foldable
import Data.Array

fact :: Int -> Int
fact n = product $ range 1 n

-- | ```purescript
-- | > Q3.main
-- | 120
-- | unit
-- | ```
main:: forall a. Eff (console :: CONSOLE | a) Unit
main = do
  print $ fact 5


module Q4 where

import Prelude
import Control.Monad.Eff
import Control.Monad.Eff.Console
import Data.Tuple
import Data.Tuple.Nested

-- | usage:
-- | ```purescript
-- | >  Hoge.perpPoint (Data.Tuple.Nested.tuple3 1.0 (-1.0) 0.0) $ Data.Tuple.Nested.tuple2 0.0 2.0
-- | Tuple (1.0) (1.0)
-- | ```
perpPoint :: forall a. (Num a)=> Tuple3 a a a -> Tuple2 a a -> Tuple2 a a
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

main:: forall a. Eff (console :: CONSOLE | a) Unit
main = do
  print $ perpPoint (tuple3 1.0 (-1.0) 0.0) $ tuple2 0.0 2.0


module Q5 where

import Prelude
import Control.Monad.Eff
import Control.Monad.Eff.Console
import Data.Char
import qualified Data.String as Str
import Data.Array
import Data.Maybe

-- | ROT13
-- | usage:
-- | ```purescript
-- | > Hoge.rot13 "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
-- | "NOPQRSTUVWXYZABCDEFGHIJKLZnopqrstuvwxyzabcdefghijklm"
-- | ```
rot13 :: String -> String
rot13 "" = ""
rot13 str = case Str.uncons str of
  Just { head: chr, tail: _str } -> (toString $ rot13ch chr) ++ rot13 _str
  Nothing -> ""

rot13ch :: Char -> Char
rot13ch = \chr ->
  let n = toCharCode chr in
  case n of
      _ | 65  <= n && n < 78  -> fromCharCode (n + 13)
      _ | 78  <= n && n < 90  -> fromCharCode (n - 13)
      _ | 97  <= n && n < 110 -> fromCharCode (n + 13)
      _ | 110 <= n && n < 123 -> fromCharCode (n - 13)
      _ | otherwise           -> chr

-- | > Q5.main
-- | "Uryyb, Jbeyq!"
-- | "Hello, World!"
-- | unit
main:: forall a. Eff (console :: CONSOLE | a) Unit
main = do
  let hello13 = rot13 "Hello, World!"
  print hello13
  print $ rot13 hello13


module Q6 where

import Prelude
import Control.Monad.Eff.Console
import Control.Monad.Eff
import Data.Array
import Data.Maybe

-- | bubble sort
-- | ```purescript
-- | > Hoge.bsort [5.0,1.0,3.0,2.0,4.0,0.0]
-- | [0.0,1.0,2.0,3.0,4.0,5.0]
-- | ```
bsort :: forall a. (Ord a)=> Array a -> Array a
bsort xs =
  case uncons $ bswap xs of
    Just { head: y, tail: ys } -> y : bsort ys
    Nothing -> []

-- | ```purescript
-- | Hoge.bswap [5.0,1.0,3.0,2.0,4.0,0.0]
-- | [0.0,5.0,1.0,3.0,2.0,4.0]
-- | ```
bswap :: forall a. (Ord a)=> Array a -> Array a
bswap xs = case uncons xs of
  Nothing -> xs
  Just { head: y, tail: ys } ->
    let zs = bswap ys in
    case uncons zs of
      Nothing -> xs
      Just { head: a, tail: as } ->
        if y > a
        then a:y:as
        else y:a:as

-- | ```purescript
-- | > Q6.main
-- | [1,4,3,2,5]
-- | [1,2,3,4,5]
-- | [1,2,3,4,5]
-- | [1,2,3,4,5,6,7,8,9]
-- | unit
-- | ```
main:: forall a. Eff (console :: CONSOLE | a) Unit
main = do
  print $ bswap [4, 3, 1, 5, 2]
  print $ bsort [4, 3, 1, 5, 2]
  print $ bsort [5, 4, 3, 2, 1]
  print $ bsort [4, 6, 9, 8, 3, 5, 1, 7, 2]


module Q7 where

import Prelude
import Control.Monad.Eff
import Control.Monad.Eff.Console
import Data.Array
import Data.Maybe

merge :: forall a. (Ord a)=> Array a -> Array a -> Array a
merge xs ys
  | length ys == 0 = xs
  | length xs == 0 = ys
  | otherwise      =
    case uncons xs of
      Nothing -> []
      Just {head: a, tail: as} ->
        case uncons ys of
          Nothing -> []
          Just {head: b, tail: bs} ->
            if a < b
            then a : merge as (b:bs)
            else b : merge (a:as) bs

msort :: forall a. (Ord a)=> Array a -> Array a
msort xs
  | length xs == 0 = []
  | length xs == 1 = xs
  | otherwise      = merge (msort (take h xs)) (msort (drop h xs))
  where
    h = (length xs) `div` 2

-- | ```purescript
-- | > Q7.main
-- | [1,2,3,4,5,6,7,8,9]
-- | unit
-- | ```
main:: forall a. Eff (console :: CONSOLE | a) Unit
main = do
  print $ msort [4, 6, 9, 8, 3, 5, 1, 7, 2]


module Q9 where

import Prelude
import Control.Monad.Eff
import Control.Monad.Eff.Console
import Data.Foldable
import Data.Array
import Data.Tuple
import Data.Tuple.Nested

-- | right triangle
-- | ```purescript
-- | > Hoge.triangle
-- | "[Tuple (Tuple (3) (4)) (5),Tuple (Tuple (4) (3)) (5),Tuple (Tuple (5) (12)) (13),Tuple (Tuple (6) (8)) (10),Tuple (Tuple (8) (6)) (10),Tuple (Tuple (8) (15)) (17),Tuple (Tuple (9) (12)) (15),Tuple (Tuple (12) (5)) (13),Tuple (Tuple (12) (9)) (15),Tuple (Tuple (12) (16)) (20),Tuple (Tuple (15) (8)) (17),Tuple (Tuple (16) (12)) (20)]"
-- | unit
-- | ```
triangle :: forall a. Eff (console :: CONSOLE | a) Unit
triangle = do
  print $ show do
    a <- range 1 20
    b <- range 1 20
    c <- range 1 20
    if a*a + b*b == c*c then return $ tuple3 a b c else []
