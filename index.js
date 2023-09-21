const core = require('@actions/core');
const github = require('@actions/github');

try {
    const milestoneTitle = core.getInput('milestone-title');
    const milestoneNext = core.getInput('milestone-next')
    console.log(`Checking Milestone ${milestoneTitle}`);

    const octokit = new github.GitHub(core.getInput('github-token'));

    octokit.issues.listMilestonesForRepo({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
    }).then(({data}) => {

        let milestone = data.find(function (milestone) {
            return milestone.title === milestoneTitle;
        });

        if (milestone == null) {
            console.log(`Milestone ${milestoneTitle} Not Found!`);
            return;
        }

        console.log(`Found Milestone ${milestone.title}`);

        if (milestone.open_issues > 0) {
            console.log(`Milestone ${milestone.title} still has ${milestone.open_issues} open issues!`);

            // TODO - Remove issues from Milestone?

        } else {
            console.log(`Milestone ${milestone.title} has no issues open.`);
        }

        octokit.issues.updateMilestone({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            milestone_number: milestone.number,
            state: 'closed'
        });

        console.log(`Closed Milestone ${milestone.title}`);

        if (milestoneNext != null) {
            var milestoneTitleCreate = milestoneNext.replace("-SNAPSHOT", "");
            let milestone = data.find(function (milestone) {
                return milestone.title === milestoneTitleCreate;
            });
            if (milestone == null) {
                octokit.issues.createMilestone({
                    owner: github.context.repo.owner,
                    repo: github.context.repo.repo,
                    title: milestoneTitleCreate
                })

                console.log(`Created Milestone ${milestoneTitleCreate}`);
            }
        }

        const options = octokit.issues.listForRepo.endpoint.merge({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            milestone: milestone.number,
            state: 'closed'
        });

        octokit.paginate(options).then(issues => {
            let notes = "";
            for (const issue of issues) {
                notes = notes + "- #" + issue.number + " " + issue.title + "\n";
            }

            console.log(`Generated change log:\n ${notes}`);

            octokit.repos.createRelease({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                tag_name: milestoneTitle,
                name: milestoneTitle,
                draft: false,
                body: notes
            });

            console.log(`Created Release ${milestone.title}`);
        });

    }).catch((error) => {
        console.debug(error);
        core.setFailed('Unknown Error!')
    })

} catch (error) {
    core.setFailed(error.message);
}
