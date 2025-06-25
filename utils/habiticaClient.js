import axios from 'axios';

const habiticaApiKey = process.env.NEXT_PUBLIC_HABITICA_API_KEY;
const habiticaUserId = 'hb-4jfno7lcs151dwpso'; // Replace with actual Habitica User ID

const habiticaClient = axios.create({
  baseURL: 'https://habitica.com/api/v3',
  headers: {
    'x-api-key': habiticaApiKey,
    'x-api-user': habiticaUserId,
    'Content-Type': 'application/json',
  },
});

export default habiticaClient;



