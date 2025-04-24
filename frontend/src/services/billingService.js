import axios from 'axios';

const API_URL = 'http://localhost:8000';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
};

export const getBillingPlans = async () => {
  try {
    const response = await axios.get(`${API_URL}/billing/plans`, getAuthHeader());
    return response.data;
  } catch (error) {
    console.error('Error fetching billing plans:', error);
    throw error;
  }
};

export const getUserPlan = async () => {
  try {
    const response = await axios.get(`${API_URL}/billing/user/plan`, getAuthHeader());
    return response.data;
  } catch (error) {
    console.error('Error fetching user plan:', error);
    throw error;
  }
};

export const changePlan = async (planId) => {
  try {
    const response = await axios.post(
      `${API_URL}/billing/user/plan`,
      { plan_id: planId },
      getAuthHeader()
    );
    return response.data;
  } catch (error) {
    console.error('Error changing plan:', error);
    throw error;
  }
};

export const rechargeCredits = async (amount) => {
  try {
    const response = await axios.post(
      `${API_URL}/billing/user/credits/recharge`,
      { amount },
      getAuthHeader()
    );
    return response.data;
  } catch (error) {
    console.error('Error recharging credits:', error);
    throw error;
  }
};

export const requestEnterpriseQuote = async () => {
  try {
    const response = await axios.post(
      `${API_URL}/billing/enterprise/quote`,
      {},
      getAuthHeader()
    );
    return response.data;
  } catch (error) {
    console.error('Error requesting enterprise quote:', error);
    throw error;
  }
};
