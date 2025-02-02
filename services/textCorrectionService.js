import { retext } from 'retext';
import retextSpell from 'retext-spell';
import dictionaryEn from 'dictionary-en';

export const correctText = async (inputText) => {
    try {
        const file = await retext()
            .use(retextSpell, { dictionary: dictionaryEn }) // Use dictionaryEn directly
            .process(inputText);

        let correctedText = inputText;
        file.messages.forEach((message) => {
            const { actual, expected } = message;
            if (expected && expected.length > 0) {
                const suggestion = expected[0];
                const regex = new RegExp(`\\b${actual}\\b`, 'g');
                correctedText = correctedText.replace(regex, suggestion);
            }
        });

        return correctedText;
    } catch (error) {
        console.error('Error correcting text:', error);
        throw error;
    }
};
