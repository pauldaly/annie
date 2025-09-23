import { Observer, Subscription, DataRecord, EventCallback } from './types.js';

export class Observable<T = unknown> {
    private functionThatTakesObserver: (observer: Observer<T>) => void | (() => void);

    constructor(functionThatTakesObserver: (observer: Observer<T>) => void | (() => void)) {
        this.functionThatTakesObserver = functionThatTakesObserver;
    }

    subscribe(observer: Observer<T>): Subscription {
        const unsubscribe = this.functionThatTakesObserver(observer);
        return {
            unsubscribe: typeof unsubscribe === 'function' ? unsubscribe : () => {}
        };
    }

    map<U>(projectionFunction: (val: T) => U): Observable<U> {
        return new Observable<U>((observer: Observer<U>) => {
            const subscription = this.subscribe({
                next(val: T) {
                    try {
                        observer.next(projectionFunction(val));
                    } catch (error) {
                        observer.error(error instanceof Error ? error : new Error(String(error)));
                    }
                },
                error(e: Error) {
                    observer.error(e);
                },
                complete() {
                    observer.complete();
                },
            });
            return subscription.unsubscribe;
        });
    }

    mergeMap<U>(anotherFunctionThatThrowsValues: (val: T) => Observable<U>): Observable<U> {
        return new Observable<U>((observer: Observer<U>) => {
            const subscription = this.subscribe({
                next(val: T) {
                    try {
                        anotherFunctionThatThrowsValues(val).subscribe({
                            next(val: U) {
                                observer.next(val);
                            },
                            error(e: Error) {
                                observer.error(e);
                            },
                            complete() {
                                // Don't complete the outer observable here
                            },
                        });
                    } catch (error) {
                        observer.error(error instanceof Error ? error : new Error(String(error)));
                    }
                },
                error(e: Error) {
                    observer.error(e);
                },
                complete() {
                    observer.complete();
                },
            });
            return subscription.unsubscribe;
        });
    }

    static fromArray<T>(array: T[]): Observable<T> {
        return new Observable<T>((observer: Observer<T>) => {
            try {
                array.forEach((val) => observer.next(val));
                observer.complete();
            } catch (error) {
                observer.error(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }

    static fromEvent<T extends Event>(element: Element, event: string): Observable<T> {
        return new Observable<T>((observer: Observer<T>) => {
            const handler = (e: Event) => observer.next(e as T);
            element.addEventListener(event, handler);
      
            return () => {
                element.removeEventListener(event, handler);
            };
        });
    }

    static fromPromise<T>(promise: Promise<T>): Observable<T> {
        return new Observable<T>((observer: Observer<T>) => {
            promise
                .then((val: T) => {
                    observer.next(val);
                    observer.complete();
                })
                .catch((e: Error) => {
                    observer.error(e);
                });
        });
    }

    static create<T>(): Observable<T> {
        return new Observable<T>((observer: Observer<T>) => {
            // Empty observable that immediately completes
            observer.complete();
        });
    }
}

export class DataObserver {
    private observers: { [key: string]: Array<EventCallback<DataRecord[]>> } = {};

    addObserver(datasource: string, observerFunction: EventCallback<DataRecord[]>): void {
        const normalizedDataSource = this.normalizeDatasource(datasource);

        if (!this.observers[normalizedDataSource]) {
            this.observers[normalizedDataSource] = [];
        }
        this.observers[normalizedDataSource].push(observerFunction);
    }

    notifyObservers(datasetName: string, data: DataRecord[]): void {
        const normalizedDatasetName = this.normalizeDatasource(datasetName);
    
        if (this.observers[normalizedDatasetName]) {
            this.observers[normalizedDatasetName].forEach((observerFunction) => {
                try {
                    observerFunction(data);
                } catch (error) {
                    console.error(`Observer error for dataset ${datasetName}:`, error);
                }
            });
        }
    }

    removeObserver(datasource: string, observerFunction: EventCallback<DataRecord[]>): void {
        const normalizedDataSource = this.normalizeDatasource(datasource);
    
        if (this.observers[normalizedDataSource]) {
            const index = this.observers[normalizedDataSource].indexOf(observerFunction);
            if (index > -1) {
                this.observers[normalizedDataSource].splice(index, 1);
            }
        }
    }

    removeAllObservers(datasource?: string): void {
        if (datasource) {
            const normalizedDataSource = this.normalizeDatasource(datasource);
            delete this.observers[normalizedDataSource];
        } else {
            this.observers = {};
        }
    }

    hasObservers(datasource: string): boolean {
        const normalizedDataSource = this.normalizeDatasource(datasource);
        return !!(this.observers[normalizedDataSource] && this.observers[normalizedDataSource].length > 0);
    }

    getObserverCount(datasource: string): number {
        const normalizedDataSource = this.normalizeDatasource(datasource);
        return this.observers[normalizedDataSource]?.length || 0;
    }

    getAllDatasources(): string[] {
        return Object.keys(this.observers);
    }

    clear(): void {
        this.observers = {};
    }

    private normalizeDatasource(datasource: string): string {
        return datasource.replace(/-/g, "_");
    }
}
