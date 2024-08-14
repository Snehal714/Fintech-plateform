const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json()); // To parse JSON bodies

const HASURA_URL = 'http://localhost:8080/v1/graphql'; // Hasura GraphQL endpoint

// Basic route to test server
app.get('/', (req, res) => {
  res.send('Fintech Platform API');
});

// Deposit Endpoint
app.post('/deposit', async (req, res) => {
  const { userId, amount } = req.body;

  // GraphQL mutation to update user balance
  const depositQuery = `
    mutation($userId: Int!, $amount: numeric!) {
      update_users(
        where: { id: { _eq: $userId } },
        _inc: { balance: $amount }
      ) {
        returning {
          id
          balance
        }
      }
    }
  `;

  try {
    const response = await axios.post(HASURA_URL, {
      query: depositQuery,
      variables: { userId, amount },
    });

    res.json({
      success: true,
      data: response.data.data.update_users.returning[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Withdrawal Endpoint
app.post('/withdraw', async (req, res) => {
  const { userId, amount } = req.body;

  // GraphQL query to get user balance
  const getUserBalanceQuery = `
    query($userId: Int!) {
      users_by_pk(id: $userId) {
        id
        balance
      }
    }
  `;

  try {
    const userResponse = await axios.post(HASURA_URL, {
      query: getUserBalanceQuery,
      variables: { userId },
    });

    const user = userResponse.data.data.users_by_pk;

    if (user.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
      });
    }

    // GraphQL mutation to update user balance
    const withdrawQuery = `
      mutation($userId: Int!, $amount: numeric!) {
        update_users(
          where: { id: { _eq: $userId } },
          _inc: { balance: -$amount }
        ) {
          returning {
            id
            balance
          }
        }
      }
    `;

    const response = await axios.post(HASURA_URL, {
      query: withdrawQuery,
      variables: { userId, amount },
    });

    res.json({
      success: true,
      data: response.data.data.update_users.returning[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
