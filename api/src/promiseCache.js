const defaultTtl = 60 * 60;
const validAtLeast = 10 * 1000;
const retry = 5 * 1000;

function cache(retrieve) {
    const context = {
        expireAt: 0,
        promise: null,

        get() {
            const {expireAt, promise} = this;
            const now = Date.now();

            if (promise && (expireAt === 0 || now + validAtLeast < expireAt)) {
                return promise;
            }

            this.expireAt = 0;
            const token = setTimeout(() => {
                this.promise = null;
            }, retry);
            this.promise = retrieve().then((obj) => {
                clearTimeout(token);
                this.expireAt = now + ((obj.ttl || defaultTtl) * 1000);
                return obj;
            });

            return this.promise;
        }
    };
    return context.get.bind(context);
}

module.exports = cache;
