const DEFAULT_SHOW_TIMINGS = [
  { hour: 9, minute: 0, screenName: "Screen 1", price: 180 },
  { hour: 10, minute: 30, screenName: "Screen 2", price: 190 },
  { hour: 12, minute: 15, screenName: "Screen 3", price: 210 },
  { hour: 14, minute: 0, screenName: "Screen 1", price: 220 },
  { hour: 15, minute: 45, screenName: "Screen 2", price: 240 },
  { hour: 17, minute: 30, screenName: "Screen 3", price: 250 },
  { hour: 19, minute: 15, screenName: "Screen 1", price: 280 },
  { hour: 21, minute: 0, screenName: "Screen 2", price: 290 },
  { hour: 22, minute: 30, screenName: "Screen 3", price: 300 },
  { hour: 23, minute: 30, screenName: "Screen 1", price: 310 },
];

const toNextShowTime = (slot, fromDate = new Date()) => {
  const showTime = new Date(fromDate);
  showTime.setHours(slot.hour, slot.minute, 0, 0);

  if (showTime <= fromDate) {
    showTime.setDate(showTime.getDate() + 1);
  }

  return showTime;
};

module.exports = {
  DEFAULT_SHOW_TIMINGS,
  toNextShowTime,
};

