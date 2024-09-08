const API_DELAY_MIN = 10;
const API_DELAY_MAX = 200;
const MAX_FOLLOWERS = 200;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const random = (min, max) => Math.ceil(Math.random() * (max - min)) + min;
const fetchOptions = {
  credentials: "include",
  headers: {
      "X-IG-App-ID": "936619743392459",
  },
  method: "GET",
};
const fetchData = async (url) => {
  try {
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
          throw new Error(`Failed to fetch data. Status: ${response.status}`);
      }
      return response.json();
  } catch (error) {
      console.log("Error fetching data:");
      throw error;
  }
};

const concatFriendshipsApiResponse = async (list, user_id, count, next_max_id = "") => {
  const currentTime = new Date().toISOString().slice(11, 23).replace("T", " ");
  console.log(`All is good at ${currentTime}, still loading...`);
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
          console.log("- - - - - - - - - - - - - - - - - - - - - - - - - - ");
          console.log(`Added to ${listName}:`);
          console.log(added);
      }
      if (removed.length > 0) {
          console.log("- - - - - - - - - - - - - - - - - - - - - - - - - - ");
          console.log(`Removed from ${listName}:`);
          console.log(removed);
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
      console.log("Error getting user ID:", "black");
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
  if (!username || typeof username !== "string" || !username.trim()) {
      console.clear();
      throw new Error("Please enter a valid username");
  }

  const user_id = await getUserId(username);
  if (!user_id) {
      throw new Error(`Could not find a user with the username ${username}`);
  }

  console.log("LOADING FOLLOWERS AND FOLLOWING...");
  const [followers, following] = await Promise.all([getFollowers(user_id), getFollowing(user_id)]);

  console.log("FOLLOWERS AND FOLLOWING LOADED");
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
      timecheck: new Date().toLocaleString("en-GB"),
  };
  console.clear();
  const previousData = getDataFromLocalstorage(username);
  compareAndLogChanges(dataToSave, previousData);
  saveDataToLocalstorage(dataToSave, username);
  console.log(`Username: ${username}`);
  console.log(`Previous check: ${previousData ? previousData.timecheck : "No previous check"}`);
  return dataToSave;
};

// Your Instagram account name in quotation marks
getUserFriendshipStats("jovansrdanov2000")
  .then((data) => {
      if (data) {
          console.log("All is good, you can check your data now!");
          console.log(data);
      } else {
          console.log("Something went wrong, there is no data to show, contact the developer.");
      }
  })
  .catch((error) => {
      console.log(error);
  });
