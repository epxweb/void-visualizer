let timerId = null;
let interval = 1000 / 60; // Default to 60 FPS

self.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'start':
            if (timerId) clearInterval(timerId);
            timerId = setInterval(() => {
                self.postMessage('tick');
            }, interval);
            break;
        case 'stop':
            if (timerId) {
                clearInterval(timerId);
                timerId = null;
            }
            break;
        case 'update-fps':
            if (payload.fps > 0) {
                interval = 1000 / payload.fps;
            }
            // If timer is running, restart it with the new interval
            if (timerId) {
                clearInterval(timerId);
                timerId = setInterval(() => {
                    self.postMessage('tick');
                }, interval);
            }
            break;
    }
};
