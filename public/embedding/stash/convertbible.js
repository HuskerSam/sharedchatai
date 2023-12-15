window.bibleCSVItems = [];
window.bible.forEach((item, bookIndex) =>{ 
    item.chapters.forEach((chapter, chapterIndex) => {
        chapter.forEach((verse, verseIndex) => {
            window.bibleCSVItems.push({
                book: item.name,
                bookAbbrev: item.abbrev,
                bookIndex,
                chapterIndex,
                verseIndex,
                verse,
            });
        });
    });
})