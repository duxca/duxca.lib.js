import { EventTargetLike } from "./Event";
/**
 * @example
 * ```ts
 * const sem = new Semaphore(2);
 * sem.addTask(()=> sleep(10) );
 * sem.addTask(()=> sleep(10) );
 * sem.addTask(()=> sleep(10) );
 * sem.addTask(()=> sleep(10) );
 * sem.addEventListener("empty", ()=>{
 *   console.log("20 seconds past");
 * });
 * ```
 */
export declare class Semaphore extends EventTargetLike {
    running: number;
    limit: number;
    queue: (() => Promise<any>)[];
    constructor(taskLimit: number);
    addEventListener(event: "empty", listener: (ev: Event) => void): any;
    addTask(task: () => Promise<any>): void;
    private check_task();
    private do_task();
}
/**
 * @example
 * ```ts
 * runSemaphore(1, [(()=> sleep(3)), (()=> sleep(5))]).then((prms)=>{
 *   console.log("8 seconds past");
 *   Promise.all(prms)
 *     .then(console.log)
 *     .catch(console.warn);
 * });
 * ```
 */
export declare function runSemaphore<A>(limit: number, tasks: [() => Promise<A>]): Promise<[Promise<A>]>;
export declare function runSemaphore<A, B>(limit: number, tasks: [() => Promise<A>, () => Promise<B>]): Promise<[Promise<A>, Promise<B>]>;
export declare function runSemaphore<A, B, C>(limit: number, tasks: [() => Promise<A>, () => Promise<B>, () => Promise<C>]): Promise<[Promise<A>, Promise<B>, Promise<C>]>;
export declare function runSemaphore<A, B, C, D>(limit: number, tasks: [() => Promise<A>, () => Promise<B>, () => Promise<C>, () => Promise<D>]): Promise<[Promise<A>, Promise<B>, Promise<C>, Promise<D>]>;
export declare function runSemaphore<T>(limit: number, tasks: (() => Promise<T>)[]): Promise<Promise<T>[]>;
