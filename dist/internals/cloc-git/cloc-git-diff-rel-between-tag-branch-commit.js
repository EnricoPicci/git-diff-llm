    let count = 0;
    let totNumFiles = 0;
    // toArray to calculate the total number of files
    (0, rxjs_1.toArray)(), (0, rxjs_1.tap)(comapareResults => {
        totNumFiles = comapareResults.length;
        const msg = (0, message_writer_1.newInfoMessage)(`Total number of files: ${totNumFiles}`);
        messageWriter.write(msg);
    }), 
    // mergeMap to emit each file diff record and start the stream of git diff for each file again
    (0, rxjs_1.mergeMap)((compareResult) => compareResult), 
    // gitDiffs$ eventually calls the command "git diff" which outputs on the stdout - gitDiffs$ Observable accumulates the output
        const msgText = `Calculating git diff for ${rec.fullFilePath} (${++count}/${totNumFiles})`;
    const startingMsg = (0, message_writer_1.newInfoMessage)(`Starting all diffs with explanations`);
    messageWriter.write(startingMsg);
        const repoOwner = fromUrlParts[fromUrlParts.length - 2];
        fromTagBranchCommit = `${repoOwner}:${urlRepoName}:${fromTagBranchCommit}`;
        const repoOwner = toUrlParts[toUrlParts.length - 2];
        toTagBranchCommit = `${repoOwner}:${urlRepoName}:${toTagBranchCommit}`;