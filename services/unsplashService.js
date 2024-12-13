import { createApi } from 'unsplash-js';
import nodeFetch from 'node-fetch';

const unsplash = createApi({
    accessKey: process.env.UNSPLASH_ACCESS_KEY,
    fetch: nodeFetch,
});

export const fetchImageURL = async (query) => {
    try {
        const response = await unsplash.search.getPhotos({
            query: query,
            perPage: 1, // Limit to 1 photo
        });

        if (response.errors) {
            throw new Error(response.errors[0]);
        }

        const firstPhoto = response.response.results[0];
        if (firstPhoto && firstPhoto.urls && firstPhoto.urls.full) {
            return firstPhoto.urls.full;
        } else {
            throw new Error('Image not found');
        }
    } catch (error) {
        console.error('Error fetching image:', error);
        throw error;
    }
};
