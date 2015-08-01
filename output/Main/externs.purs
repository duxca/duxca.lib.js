module Main (main) where
import Control.Monad.Eff.Console ()
import Prim ()
import Control.Monad.Eff.Console ()
foreign import main :: forall t2. Control.Monad.Eff.Eff (console :: Control.Monad.Eff.Console.CONSOLE | t2) Prelude.Unit