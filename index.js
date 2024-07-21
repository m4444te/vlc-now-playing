import axios from 'axios';
import Mastodon from 'mastodon-api';
import dotenv from 'dotenv';

dotenv.config();

const vlcHost = 'localhost';
const vlcPort = 8080;
const vlcPassword = process.env.VLC_PASSWORD;
const mastodonAccessToken = process.env.MASTODON_ACCESS_TOKEN;
const mastodonApiUrl = process.env.MASTODON_API_URL;
const checkInterval = process.env.CHECK_INTERVAL || 5000; // Default to 5 seconds if not set

let previousTitle = '';
let previousArtist = '';

const M = new Mastodon({
  access_token: mastodonAccessToken,
  api_url: mastodonApiUrl
});

async function getCurrentSong() {
  try {
    const response = await axios.get(`http://${vlcHost}:${vlcPort}/requests/status.json`, {
      auth: {
        username: '',
        password: vlcPassword
      }
    });

    const info = response.data.information;
    const meta = info && info.category && info.category.meta;

    if (meta && meta.title && meta.artist && meta.description) {
      return { title: meta.title, artist: meta.artist, description: meta.description };
    } else {
      return { title: '', artist: '', description: '' };
    }
  } catch (error) {
    console.error('Error connecting to VLC:', error);
    return { title: '', artist: '', description: '' };
  }
}

async function postToMastodon(message) {
  try {
    const response = await M.post('statuses', { status: message });
    console.log('Message posted to Mastodon:\n\n', message);
    // console.log('Mastodon response:', response.data);
  } catch (error) {
    console.error('Error posting to Mastodon:', error.response ? error.response.data : error.message);
  }
}

async function monitorVLC() {
  setInterval(async () => {
    const currentSong = await getCurrentSong();

    if (currentSong.title !== previousTitle || currentSong.artist !== previousArtist) {
      if (currentSong.title && currentSong.artist) {
        const message = `🔊 #nowplaying #music #3615radio \n\n ${currentSong.title} by ${currentSong.artist} \n\n ${currentSong.description} `;
        // console.log(message);
        await postToMastodon(message);
      } else {
        console.log('No song is currently playing or metadata is not available.');
      }

      previousTitle = currentSong.title;
      previousArtist = currentSong.artist;
    }
  }, checkInterval);
}

monitorVLC();
