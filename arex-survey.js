(async () => {
  // Pulling in questions from this repo: https://github.com/sugarliving/sugar-arex-survey
  const categories = await $.getJSON(
    "https://raw.githubusercontent.com/sugarliving/sugar-arex-survey/main/categories.json"
  );
  const questions = await $.getJSON(
    "https://raw.githubusercontent.com/sugarliving/sugar-arex-survey/main/questions.json"
  );

  // Using webflow to hot the checkbox icons
  const icons = {
    unchecked:
      "https://uploads-ssl.webflow.com/5f308a2a4e2694784fd8c994/61560ef446f49f558702d0a0_icon_survey_answer_unchecked.svg",
    checked:
      "https://uploads-ssl.webflow.com/5f308a2a4e2694784fd8c994/61560ef4e7afa55aef88e0a8_icon_survey_answer_checked.svg",
  };

  // Managing the current question, options, and whether or not they have already read the intro
  const state = {
    active_question_index: 0,
    active_question: questions[0],
    skip_intro: JSON.parse(
      localStorage.getItem("sugar_arex_scorecard_skip_intro")
    ),
  };

  // Display the intro popup if they haven't read it yet
  const setIntroModal = function () {
    if (!state.skip_intro || state.skip_intro === "false") {
      $("#arex-survey-intro").fadeIn("fast");
    } else {
      $("#arex-survey-intro").fadeOut("fast");
    }
  };

  // Store whether or not they've started the survey to ignore the popup in the future
  $("#survey-intro-continue-button").on("click", function (e) {
    e.preventDefault();
    setIntroModal();
  });

  // Get the highest possible score for a question
  const maxScore = function (question) {
    let max = 0;

    if (question.multiple_choice) {
      max = 5;
    } else {
      // Allows for an explicit override in the question list
      question.options.forEach((option) => {
        if (option.score > max) {
          max = option.score;
        }
      });
    }

    return max;
  };

  // Create the form that will eventually submit the entire survey
  // We're injecting fields into the webflow form on this page #wf-form-AREX-Survey-Form
  const setSurveyForm = function () {
    let questionFormCreationIndex = 0;
    questions.forEach((question) => {
      $("<input>")
        .attr({
          type: "hidden",
          id: `arex-survey-question-${questionFormCreationIndex}`,
          name: question.title,
        })
        .appendTo("#wf-form-AREX-Survey-Form");

      $("<input>")
        .attr({
          type: "hidden",
          id: `arex-survey-question-${questionFormCreationIndex}-score`,
          name: `Question ${questionFormCreationIndex + 1} Score`,
          value: 0,
          maxScore: maxScore(question),
          category: question.category,
        })
        .appendTo("#wf-form-AREX-Survey-Form");

      questionFormCreationIndex++;
    });

    $("<input>")
      .attr({
        type: "hidden",
        id: `arex-survey-total`,
        name: "Total Score",
      })
      .appendTo("#wf-form-AREX-Survey-Form");

    $("<input>")
      .attr({
        type: "hidden",
        id: `arex-survey-total-max`,
        name: "Total Max Score",
      })
      .appendTo("#wf-form-AREX-Survey-Form");

    $("<input>")
      .attr({
        type: "hidden",
        id: `arex-survey-id`,
        name: "Survey ID",
      })
      .appendTo("#wf-form-AREX-Survey-Form");
  };

  // Sum the value of each question
  const calculateScore = function (scores) {
    return scores.reduce((a, b) => a + b, 0);
  };

  // Assign values and scores to hidden fields after the answer submission
  const assignQuestionValues = function () {
    const selectedOptionsValues = [];
    const selectedOptionsScores = [];

    $(".survey-answer-option").each(function () {
      if ($(this).attr("data-selected") === "true") {
        selectedOptionsValues.push($.trim($(this).text()));
        selectedOptionsScores.push(
          parseFloat($.trim($(this).attr("data-score")))
        );
      }
    });

    $(`#arex-survey-question-${state.active_question_index}`).val(
      selectedOptionsValues
    );
    $(`#arex-survey-question-${state.active_question_index}-score`).val(
      calculateScore(selectedOptionsScores).toFixed(1)
    );
  };

  // Calculate the question progress
  const questionProgress = function () {
    return (state.active_question_index + 1) / questions.length;
  };

  // Populate the question and navigation state
  const setQuestion = function () {
    activeQuestionOptionsIndex = 0;

    // Set the question copy
    if (state.active_question) {
      if (questionProgress() < 1) {
        $("#survey-progress-label").text(
          `${state.active_question_index + 1} of ${questions.length}`
        );
      } else {
        $("#survey-progress-label").text(`Last one!`);
      }
      $("#survey-progress-bar").animate(
        { width: `${100 * questionProgress()}%` },
        200
      );
      $("#active-question-title").text(
        `${state.active_question_index === 0 ? "To start —" : ""} ${
          state.active_question.title
        }`
      );
      if (state.active_question.multiple_choice) {
        $("#active-question-type").text("Select all that apply");
      } else {
        $("#active-question-type").text("Select one");
      }
      $("#active-question-options").empty();

      // Dump all of the options out
      state.active_question.options.forEach((option) => {
        $(`<div class="survey-answer-option"
            id="option-${activeQuestionOptionsIndex}"
            data-selected="false"
            data-score="${option.score}">
              ${option.label}
              <img class="survey-answer-option-checkbox" src="${icons.unchecked}"/>
           <div/>`).appendTo("#active-question-options");
        activeQuestionOptionsIndex++;
      });
    } else {
      $("#active-question-title").text("done");
      $("#active-question-category").text("done");
      $("#active-question-options").empty();
    }

    // Set navigation button copy
    if (questionProgress() >= 1) {
      $("#survey-next-button-text").text("Get your score!");
      $("#survey-next-button-icon").hide();
      $("#survey-next-button").removeClass("button-icon-trailing");
    } else {
      $("#survey-next-button-text").text("Next question");
      $("#survey-next-button-icon").show();
      $("#survey-next-button").addClass("button-icon-trailing");
    }

    if (state.active_question_index === 0) {
      $("#survey-prev-button").fadeTo("fast", 0.4);
      $("#survey-prev-button").css("cursor", "not-allowed");
    } else {
      $("#survey-prev-button").fadeTo("fast", 1);
      $("#survey-prev-button").css("cursor", "pointer");
    }

    // Toggling the selection option state
    $(".survey-answer-option").on("click", function () {
      $(this).toggleClass("selected");
      $(this).attr("data-selected", function (index, attr) {
        return attr == "false" ? "true" : "false";
      });
      $(this)
        .find(".survey-answer-option-checkbox")
        .attr("src", function (index, attr) {
          return attr == icons.unchecked ? icons.checked : icons.unchecked;
        });

      // Allow for multi-select if it's multiple choice
      if (!state.active_question.multiple_choice) {
        $(this)
          .siblings()
          .each(function () {
            $(this).removeClass("selected");
            $(this).attr("data-selected", "false");
            $(this)
              .find(".survey-answer-option-checkbox")
              .attr("src", icons.unchecked);
          });
      }
    });
  };

  // Add up the scores for each category and save it to local storage
  const setFinalScorecard = function () {
    const finalScorecard = [];

    for (let i = 0; i < categories.length; i++) {
      let categoryScore = {};
      categoryScore[categories[i].name] = {
        scores: [],
        max_scores: [],
      };
      finalScorecard.push(categoryScore);
    }

    let allScores = [];
    let allMaxScores = [];
    $("#wf-form-AREX-Survey-Form input[id*=score]").each(function () {
      finalScorecard.forEach((category) => {
        if (
          category.hasOwnProperty(categories[$(this).attr("category")].name)
        ) {
          category[categories[$(this).attr("category")].name].scores.push(
            parseInt($(this).val())
          );
          category[categories[$(this).attr("category")].name].max_scores.push(
            parseInt($(this).attr("maxscore"))
          );
        }
      });

      allScores.push(parseInt($(this).val()));
      allMaxScores.push(parseInt($(this).attr("maxscore")));
    });

    $("input#arex-survey-total").val(allScores.reduce((a, b) => a + b, 0));
    $("input#arex-survey-total-max").val(
      allMaxScores.reduce((a, b) => a + b, 0)
    );

    console.log(finalScorecard);

    localStorage.setItem(
      "sugar_arex_scorecard",
      JSON.stringify(finalScorecard, undefined, 4)
    );
  };

  // Create a "unique" identifier we can lookup the score by later
  const assignSurveyId = function () {
    var date = new Date();
    var year = date.getFullYear();
    var month = date.getMonth();
    var day = date.getDate();
    var hour = date.getHours();
    var minute = date.getMinutes();
    // Random 4 alphanumeric character hash to add to the end to try to get some additional "unique-ness"
    let hash = Math.random().toString(36).slice(0, 4);

    $("#arex-survey-id").val(year + month + day + hour + minute + hash);
  };

  // Setup the navigation for previous and next questions
  const setNavigation = function () {
    $("#survey-next-button").on("click", function (e) {
      e.preventDefault();

      // If it's the last question, submit the form
      if (questionProgress() >= 1) {
        assignQuestionValues();
        setFinalScorecard();
        localStorage.setItem("sugar_arex_scorecard_skip_intro", "true");
        $("#wf-form-AREX-Survey-Form").submit();

        // Move to the next question
      } else {
        assignQuestionValues();
        state.active_question = questions[state.active_question_index + 1];
        state.active_question_index = state.active_question_index + 1;
        setQuestion();
      }
    });

    $("#survey-prev-button").on("click", function (e) {
      e.preventDefault();
      if (state.active_question_index > 0) {
        state.active_question = questions[state.active_question_index - 1];
        state.active_question_index = state.active_question_index - 1;
        setQuestion();
      }
    });
  };

  assignSurveyId();
  setIntroModal();
  setSurveyForm();
  questionProgress();
  setQuestion();
  setNavigation();
})();
