export default (xmlString) => {
    return new Promise((resolve, reject) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            reject(new Error('parser.commonError'));
        }

        const channel = xmlDoc.querySelector('channel');
        if (!channel) {
            reject(new Error('parser.incorrectRss'));
        }

        // Общая информация о фиде
        const feed = {
            title: channel.querySelector('title')?.textContent ?? '',
            description: channel.querySelector('description')?.textContent ?? '',
            link: channel.querySelector('link')?.textContent ?? '',
        };

        // Посты
        const items = [...channel.querySelectorAll('item')].map((item) => ({
            title: item.querySelector('title')?.textContent ?? '',
            description: item.querySelector('description')?.textContent ?? '',
            link: item.querySelector('link')?.textContent ?? '',
            guid: item.querySelector('guid')?.textContent ?? '',
            pubDate: item.querySelector('pubDate')?.textContent ?? '',
            creator: item.querySelector('dc\\:creator, creator')?.textContent ?? '',
        }));

        resolve({ feed, posts: items});
    });
};