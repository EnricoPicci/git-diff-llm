# Instructions for an LLM to create the browser client html page

You are an experienced html delveoper and you have been asked to create a web page that will allow a user to enter the following information:

-   projectDir: string - the directory of the project which must be a directory on the local file system which contains a git repository
-   from_tag_branch_commit: string - the commit hash of the tag or branch that you want to compare from
-   url_to_remote_repo: string - optional, if provided is the url to the remote repository
-   to_tag_branch_commit: string - the commit hash of the tag or branch that you want to compare to
-   use_ssh: boolean - optional
-   repoFolder: string - the directory where the directory of the project is located
-   prompt_for_modified_file: string - a text that represents the prompt used with each modified file
-   prompt_for_new_file: string - a text that represents the prompt used with each new file
-   prompt_for_deleted_file: string - a text that represents the prompt used with each deleted file
-   prompt_for_summmary_of_diffs: string - a text that represents the prompt used to generate the summary of diffs
-   outdir: string - the directory where the output files will be written to and must be a directory on the local file system
-   languages: string[] - optional - an array of strings that represent the programming languages that the diffs will be generated for

The page should have a button that when clicked will generate a json object that contains the values of the input fields.

I want to use plain html elements and not any frameworks or libraries.

Now take a deep breath and let's get started.


## second question
The input field "from_tag_branch_commit" should be actually 3 fields:
-   from_tag: string - the tag you want to compare from
-   from_branch: string - the branch you want to compare from
-   from_commit: string - the commit hash you want to compare from

Any time one of these fields is changed, the other fields should be cleaned up.

Simalarly, the input field "to_tag_branch_commit" should be actually 3 fields:
-   to_tag: string - the tag you want to compare to
-   to_branch: string - the branch you want to compare to
-   to_commit: string - the commit hash you want to compare to

Any time one of these fields is changed, the other fields should be cleaned up.

Can you please update the page to reflect these changes?

## third question
No, I was not clear. What I want is the following:
- If the user keys a value in the "from_tag" field, the "from_branch" and "from_commit" fields should immediately cleaned up.
- If the user keys a value in the "from_branch" field, the "from_tag" and "from_commit" fields should immediately cleaned up.
- If the user keys a value in the "from_commit" field, the "from_tag" and "from_branch" fields should immediately cleaned up.

Similarly, for the "to_tag_branch_commit" fields.

Can you please update the page to reflect these changes?

## fourth question
Now, imagine there is an api that returns a list of tags or branches or commits for a given project directory. The api is called `getTagsBranchesCommits` and it takes the following parameters:
-   projectDir: string - the directory of the project which must be a directory on the local file system which contains a git repository
-  type: string - the type of the tags, branches or commits to return. It can be one of the following values: "tags", "branches", "commits"

The api returns a list of strings.
I would like to change the input fields "from_tag", "from_branch", "from_commit", "to_tag", "to_branch" and "to_commit" to be dropdowns that are populated with the values returned by the api.

Can you please update the page to reflect these changes?