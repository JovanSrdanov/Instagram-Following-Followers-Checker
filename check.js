const styledLog = (message, color, backgroundColor, fontSize) => {
  const padding = '5px';
  const borderRadius = '10px';
  console.log(
    `%c${message}`, 
    `color: ${color}; background-color: ${backgroundColor}; font-size: ${fontSize}px; padding: ${padding}; border-radius: ${borderRadius};`
  );
};

const fetchOptions = {
  credentials: "include",
  headers: {
    "X-IG-App-ID": "936619743392459",
  },
  method: "GET",
};

const API_DELAY_MIN = 10;
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
    styledLog("Error fetching data:", "black", "red", 32);
    throw error;
  }
};

const concatFriendshipsApiResponse = async (list, user_id, count, next_max_id = "") => {
  const currentTime = new Date().toISOString().slice(11, 23).replace('T', ' ');
  styledLog(`All is good at ${currentTime}, still loading...`, "white", "green", 12);
  
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
      styledLog("No previous data found. Saving current data to local storage.", "black", "yellow", 32);
      return;
  }
  const compareListsAndLogChanges = (currentList, previousList, listName) => {
      const added = currentList.filter((item) => !previousList.includes(item));
      const removed = previousList.filter((item) => !currentList.includes(item));

      if (added.length > 0) {
          styledLog(`Added to ${listName}:`, "silver", "lime", 16);
          console.log(added);
      }
      if (removed.length > 0) {
          styledLog(`Removed from ${listName}:`, "silver", "orange", 16);
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
    styledLog("Error getting user ID:", "black", "red", 32);
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
  if (!username || typeof username !== 'string' || !username.trim()) {
    console.clear();
    throw new Error("Please enter a valid username");
  }
  
  const user_id = await getUserId(username);
  if (!user_id) {
    throw new Error(`Could not find a user with the username ${username}`);
  }

  styledLog("LOADING FOLLOWERS AND FOLLOWING...", "white", "Teal", 14);  
  const [followers, following] = await Promise.all([
    getFollowers(user_id),
    getFollowing(user_id),
  ]);
  
  styledLog("FOLLOWERS AND FOLLOWING LOADED", "black", "DarkGreen", 14);
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
  styledLog(`Username: ${username}`, "LightGray", "MediumPurple", 14);
  styledLog(`Previous check: ${previousData ? previousData.timecheck : "No previous check"}`, "Lavender", "Indigo", 14);
  return dataToSave;
};

// Your Instagram account name in quotation marks
getUserFriendshipStats("jovansrdanov2000").then((data) => {
  if(data){
    console.log(data);
    styledLog("All is good, you can check your data above!", "white", "ForestGreen", 32);
  }
  else{
    styledLog("Something went wrong, there is no data to show, contact the developer.", "black", "orange", 32);
  }   
}).catch((error) => {
  styledLog(error, "black", "red", 32);
 }
);
