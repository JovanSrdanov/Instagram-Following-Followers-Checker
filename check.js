const fetchOptions = {
  credentials: "include",
  headers: {
    "X-IG-App-ID": "936619743392459",
  },
  method: "GET",
};

const API_DELAY_MIN = 100;
const API_DELAY_MAX = 200;
const MAX_FOLLOWERS = 200;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const random = (min, max) => Math.ceil(Math.random() * (max - min)) + min;

const fetchData = async (url) => {
  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`Failed to fetch data. Status: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

const concatFriendshipsApiResponse = async (list, user_id, count, next_max_id = "") => {
  let url = `https://www.instagram.com/api/v1/friendships/${user_id}/${list}/?count=${count}`;
  if (next_max_id) {
    url += `&max_id=${next_max_id}`;
  }
  const data = await fetchData(url);

  if (data.next_max_id) {
    const timeToSleep = random(API_DELAY_MIN, API_DELAY_MAX);
    await sleep(timeToSleep);
    return data.users.concat(await concatFriendshipsApiResponse(list, user_id, count, data.next_max_id));
  }
  return data.users;
};

const saveDataToLocalstorage = (data, username) => {
  localStorage.setItem("MY_FRIENDSHIP_DATA_" + username.toUpperCase(), JSON.stringify(data));
};

const getDataFromLocalstorage = (username) => {
  const data = localStorage.getItem("MY_FRIENDSHIP_DATA_" + username.toUpperCase());
  return data ? JSON.parse(data) : null;
};

const compareAndLogChanges = (currentData, previousData) => {
  if (!previousData) {
      console.log("No previous data found. Saving current data to local storage.");
      return;
  }
  const compareListsAndLogChanges = (currentList, previousList, listName) => {
      const added = currentList.filter((item) => !previousList.includes(item));
      const removed = previousList.filter((item) => !currentList.includes(item));

      if (added.length > 0) {
          console.log(`Added to ${listName}:`, added);
      }
      if (removed.length > 0) {
          console.log(`Removed from ${listName}:`, removed);
      }
  };
  compareListsAndLogChanges(currentData.myFollowers, previousData.myFollowers, "myFollowers");
  compareListsAndLogChanges(currentData.myFollowing, previousData.myFollowing, "myFollowing");
  compareListsAndLogChanges(currentData.peopleIDontFollowBack, previousData.peopleIDontFollowBack, "peopleIDontFollowBack");
  compareListsAndLogChanges(currentData.peopleNotFollowingMeBack, previousData.peopleNotFollowingMeBack, "peopleNotFollowingMeBack");
};

const getUserId = async (username) => {
  const lower = username.toLowerCase();
  const url = `https://www.instagram.com/api/v1/web/search/topsearch/?context=blended&query=${lower}&include_reel=false`;
  try {
    const data = await fetchData(url);
    const result = data.users?.find((result) => result.user.username.toLowerCase() === lower);
    return result?.user?.pk || null;
  } catch (error) {
    console.error("Error getting user ID:", error);
    throw error;
  }
};

const getFollowers = (user_id, count = MAX_FOLLOWERS, next_max_id = "") => {
  return concatFriendshipsApiResponse("followers", user_id, count, next_max_id);
};

const getFollowing = (user_id, count = MAX_FOLLOWERS, next_max_id = "") => {
  return concatFriendshipsApiResponse("following", user_id, count, next_max_id);
};

const getUserFriendshipStats = async (username) => {
  console.clear();

  const user_id = await getUserId(username);
  if (!user_id) {
    throw new Error(`Could not find a user with the username ${username}`);
  }

  console.log(`LOADING FOLLOWERS...`);
  const followers = await getFollowers(user_id);
  console.log(`LOADING FOLLOWING...`);
  const following = await getFollowing(user_id);
  
  const followersUsernames = followers.map((follower) => follower.username.toLowerCase()).sort();
  const followingUsernames = following.map((followed) => followed.username.toLowerCase()).sort();
  const followerSet = new Set(followersUsernames);
  const followingSet = new Set(followingUsernames);
  
  const PeopleIDontFollowBack = Array.from(followerSet).filter((follower) => !followingSet.has(follower)).sort();
  const PeopleNotFollowingMeBack = Array.from(followingSet).filter((following) => !followerSet.has(following)).sort();
  const dataToSave = {
    myFollowers: followersUsernames,
    myFollowing: followingUsernames,
    peopleIDontFollowBack: PeopleIDontFollowBack,
    peopleNotFollowingMeBack: PeopleNotFollowingMeBack,
    timecheck: (new Date()).toLocaleString("en-GB")
  };
  console.clear();  
  const previousData = getDataFromLocalstorage(username);
  compareAndLogChanges(dataToSave, previousData);
  saveDataToLocalstorage(dataToSave, username);
  console.log("Username: " + username)
  console.log("Previous check: " + previousData.timecheck)
  return dataToSave;
};
// Your instagram account name in quotation marks
getUserFriendshipStats("").then((data) => {
  console.log(data);
});
