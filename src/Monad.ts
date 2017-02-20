
export interface Monad<A> {
  mbind<B, M extends Monad<B>>(f: (a: A)=> M): M;
}
export interface MonadConstructor<A>{
  new(...args: any[]): Monad<A>;
  pure<M extends Monad<A>>(a: A | M): M;
}

export interface MonadPlus<A> extends Monad<A> {
  mplus<M extends MonadPlus<A>>(ma: M): M;
  isZero(): boolean;
}

export interface MonadPlusConstructor<A> extends MonadConstructor<A> {
  new(...args: any[]): MonadPlus<A>;
  pure<M extends MonadPlus<A>>(a: A | M): M;
  mzero: MonadPlus<A>;
}

/**
 * @example
 * ```ts
 * class Maybe<A> implements Monad<A> {
 *   constructor(public nullable: A | null){} // Just A | Nothing
 *   mbind<B>(f: (a: A)=> Maybe<B>): Maybe<B>{
 *     if(this.nullable == null){ return new Maybe<B>(null); } // Nothing
 *     else{ return f(this.nullable); } // Just
 *   }
 *   static pure<A>(a: A | Maybe<A>): Maybe<A>{
 *     if(a instanceof Maybe){ return a; }
 *     else{ return new Maybe(a); }
 *   }
 * }
 * const getHoge: (b: string)=> Maybe<RegExpExecArray> = do_notation<RegExpExecArray>(Maybe)(function*(text: string){
 *   const hoge: RegExpExecArray = yield (new Maybe(/hoge/.exec(text)));
 *   console.assert(hoge != null);
 *   return hoge[0];
 * });
 * ```
 * @prop constructor - return type Monad constructor
 */
export function do_notation<A>(constructor: MonadConstructor<A>) {
  return <B, M extends Monad<A>>(generatorFunc: (b: B)=> Iterator<M>)=> {
    return (b: B): M => {
      const generator: Iterator<M> = generatorFunc(b);
      return <M>next();
      function next(a?: A): Monad<A> {
        const result = generator.next(a);
        console.info(result);
        if (result.done) { return constructor.pure(result.value); }
        else{              return result.value.mbind(next); }
      }
    };
  };
}

export class Maybe<A> implements Monad<A> {
  constructor(public nullable: A | null){} // Just A | Nothing
  mbind<B>(f: (a: A)=> Maybe<B>): Maybe<B>{
    if(this.nullable == null){ return new Maybe<B>(null); } // Nothing
    else{ return f(this.nullable); } // Just
  }
  static pure<A>(a: A | Maybe<A>): Maybe<A>{
    if(a instanceof Maybe){ return a; }
    else{ return new Maybe(a); }
  }
}

