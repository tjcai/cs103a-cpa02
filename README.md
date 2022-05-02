# cs103a-cpa02
CPA02 for COSI 103A, Spring 2022
![Image text]

1. Description of what my app does and how to use it.

1.1 Purpose of my app

My app allows user to search for drama based on genre or its country. Backed up by a dataset containing 5000 top drama, users could explore and discover drama based on their input. The searching results of dramas are ranked by its popularity, with its name, synopsis, and other relevant information provided. Apart from that, one could also add interested drama into favorite list. User could also edit contents in that favorite list.

1.2 How to use it

1.2.1 Home page

From this picture, you could see that there is a navbar in the top, containing Home, About, Favorites, and Login/Logout. Home brings one back to this page; About brings user to about page which briefly describes the author and purpose of this app; Favorites brings user to their customized facvorite list, in which one could add or delete drama; Login/logout leads user to login so as to be able to use favorite list function. Merely searching for drama does not need to be logged in.

![login](https://github.com/tjcai/cs103a-cpa02/blob/main/README-PICs/login.png?raw=true)

On the foolowing, one could see two search boxes. The first supports searching by genre, and the second supports searching by region. Currently, both only support sesarching by one key word (i.e. Mystery, China; two exceptions: Hong Kong, South Korea). To learn more about what genres or regions one can serach, one could click on the collapse button to view comprehensive list. Make sure to enter exactly as what has been displayed.

![coll](https://github.com/tjcai/cs103a-cpa02/blob/main/README-PICs/home_collapse.png?raw=true)

1.2.2 Search Page

1.2.2.1 Search by category

This page shows result of searching by Mystery in category search. The left most column is the popularity rank, with following columns providing more detailed information.

![search](https://github.com/tjcai/cs103a-cpa02/blob/main/README-PICs/search_mystery.png?raw=true)

After clicking the hyperlink in Name column, one would be brought to the detailed content page to demonstrate more information of each drama. One would be able to see synopsis and some actors as well as directors.

![content](https://github.com/tjcai/cs103a-cpa02/blob/main/README-PICs/content_page.png?raw=true)

After clikcing Add to favorites button in the left-most, then this drama would be successfully added into favorite list. It is convenient for one to remove drama from this favorite list through clicking "X" in the upper left. Clicking the title would bring one back to the detailed content page of this drama.

![fav](https://github.com/tjcai/cs103a-cpa02/blob/main/README-PICs/favorite_list.png?raw=true)



1.2.2.2 Search by region

The process is similar to that described in search by category.

1.2.3 Login Page

![login](https://github.com/tjcai/cs103a-cpa02/blob/main/README-PICs/login_signup.png?raw=true)

2.1 How to install my app and have it run locally
```
cd cs103a-cpa02
```
into the folder of project
```
npm install
```
to install all required packages 
```
nodemon app.js
```
to start service

open web browser and enter localhost:5000 to visit website
