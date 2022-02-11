const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
require('dayjs/locale/fr');

dayjs.locale('fr');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Europe/Paris");

const formatLong = (date) => {
    date = dayjs(date).add(5, 'minute').format('dddd D MMMM YYYY à H:mm');
    return date;
}

module.exports = {
    formatLong,
};