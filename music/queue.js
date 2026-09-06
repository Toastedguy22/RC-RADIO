class Queue {
  constructor() {
    this.current = null;
    this.upNext = [];
    this.history = [];
  }

  add(track) {
    this.upNext.push(track);
  }

  next() {
    if (this.current) this.history.unshift(this.current);
    this.current = this.upNext.shift() || null;
    return this.current;
  }

  back() {
    if (!this.history.length) return null;
    if (this.current) this.upNext.unshift(this.current);
    this.current = this.history.shift();
    return this.current;
  }

  clear() {
    this.upNext = [];
  }

  shuffle() {
    for (let index = this.upNext.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [this.upNext[index], this.upNext[swapIndex]] = [this.upNext[swapIndex], this.upNext[index]];
    }
  }

  remove(index) {
    if (index < 1 || index > this.upNext.length) return null;
    return this.upNext.splice(index - 1, 1)[0];
  }

  move(from, to) {
    if (from < 1 || from > this.upNext.length || to < 1 || to > this.upNext.length) return false;
    const [track] = this.upNext.splice(from - 1, 1);
    this.upNext.splice(to - 1, 0, track);
    return true;
  }
}

module.exports = { Queue };
