declare module 'howler' {
    export class Howl {
        constructor(options: any);
        play(id?: any): any;
        pause(id?: any): this;
        stop(id?: any): this;
        unload(): this;
        playing(id?: any): boolean;
        duration(id?: any): number;
        seek(seek?: number, id?: any): any;
        volume(vol?: number, id?: any): any;
        once(event: string, fn: (...args: any[]) => void, id?: any): this;
    }
}
