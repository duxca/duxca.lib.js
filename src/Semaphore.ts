import {fetchEvent, EventTargetLike} from "./Event";

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
export class Semaphore extends EventTargetLike {
  running: number;
  limit: number;
  queue: (() => Promise<any>)[];
  constructor(taskLimit: number){
    super();
    this.running = 0;
    this.limit = taskLimit;
    this.queue = [];
  }
  addEventListener(event: "empty", listener: (ev: Event)=> void ){
    return super.addEventListener.apply(this, arguments);
  }
  addTask(task: () => Promise<any>) {
    this.queue.push(task);
    this.check_task();
  }
  private check_task(){
    if(this.queue.length === 0){
      this.dispatchEvent(new Event("empty"));
      return;
    }
    if(this.running > this.limit){ return; }
    this.do_task();
  }
  private do_task(){
    const task = this.queue.shift();
    if (task == null) { return; }
    this.running++;
    const prm = task();
    prm
      .catch((err) => { console.warn(err, new Error().stack) })
      .then(() => {
        this.running--;
        this.check_task();
      });
  }
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
export function runSemaphore<A>(limit: number, tasks: [()=>Promise<A>]): Promise<[Promise<A>]>;
export function runSemaphore<A,B>(limit: number, tasks: [()=>Promise<A>,()=>Promise<B>]): Promise<[Promise<A>,Promise<B>]>;
export function runSemaphore<A,B,C>(limit: number, tasks: [()=>Promise<A>,()=>Promise<B>,()=>Promise<C>]): Promise<[Promise<A>,Promise<B>,Promise<C>]>;
export function runSemaphore<A,B,C,D>(limit: number, tasks: [()=>Promise<A>,()=>Promise<B>,()=>Promise<C>,()=>Promise<D>]): Promise<[Promise<A>,Promise<B>,Promise<C>,Promise<D>]>;
export function runSemaphore<T>(limit: number, tasks: (() => Promise<T>)[]): Promise<Promise<T>[]>;
export function runSemaphore(limit: number, tasks: (() => Promise<any>)[]): Promise<Promise<any>[]> {
  const sem = new Semaphore(limit);
  const rets: Promise<any>[] = [];
  tasks.forEach((task, i)=>{
    sem.addTask(()=>{
      const prm = task();
      return prm.then((ret)=>{
        rets[i] = prm;
        return ret;
      });
    });
  });
  return fetchEvent(sem, "empty").then(()=>{
    return rets;
  });
}